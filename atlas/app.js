/* World Board Game Atlas — portal app */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = window.ATLAS_I18N, A_ = window.Atlas, ART = window.AtlasArt;

  /* ---------- language ---------- */
  let lang = 'ja';
  try { lang = localStorage.getItem('aicoding-lang') || (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))(navigator.language || 'ja'); } catch (e) {}   // zh-TW / zh-HK / zh-Hant → zh-TW, other zh → zh
  if (!I[lang]) lang = 'ja';
  const t = (k, v) => { let s = (I[lang] && I[lang][k]) ?? I.en[k] ?? I.ja[k] ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const gname = g => g.name[lang] || g.name.en;
  const iname = it => it.name[lang] || it.name.en;
  // the place of the 3D table (Table3D.table(): 0 ちゃぶ台 … 5 書斎) names the portal's own 3D play: 「ちゃぶ台へ」→「書斎へ」
  const P3 = () => window.Table3D && Table3D.placeText ? Table3D : null;
  const placeT = kind => { const X = P3(); if (!X) return t(kind === 'go' ? 'today.go' : 'bv.table'); return X.placeText(kind, lang) || t(kind === 'go' ? 'today.go' : 'bv.table'); };
  const utx = u => window.Atlas && Atlas.updText ? Atlas.updText(u, lang) : (lang === 'ja' ? u[2] : u[3]);   // changelog line in the current language
  const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString(lang, { month: 'short', day: 'numeric' }); } catch (e) { return d; } };

  /* ---------- state ---------- */
  let W = A_.load(), P = A_.allProgress(), ACH = A_.achievements(P, W), C = A_.coins(W, ACH);
  if (W.name && A_.shareName) A_.shareName(W.name, true);   // the portal name is the player name in every game
  function refresh() { P = A_.allProgress(); ACH = A_.achievements(P, W); C = A_.coins(W, ACH); $('coinN').textContent = C.balance.toLocaleString(); document.querySelectorAll('.coinM').forEach(e => { e.textContent = C.balance.toLocaleString(); }); }

  /* ---------- sound effects: synthesized with WebAudio (no files), one shared AudioContext ---------- */
  const SFX = (() => {
    let on = A_.sfxOn ? A_.sfxOn() : true, nb = null;
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    addEventListener('pointerdown', () => { if (on) ac(); }, { capture: true, passive: true });
    // only play when audio is running (or is being resumed by this very tap) — never queue sounds for later
    const ready = () => { if (!on) return null; const C = window.__atlasAC || (navigator.userActivation && navigator.userActivation.isActive ? ac() : null); if (!C) return null;
      if (C.state === 'running') return C; if (C.state === 'suspended' && navigator.userActivation && navigator.userActivation.isActive) { C.resume(); return C; } return null; };
    const noise = C => { if (nb) return nb; const n = C.sampleRate; nb = C.createBuffer(1, n, n); const d = nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return nb; };
    function tone(C, t, f0, f1, dur, type = 'sine', vol = .12, att = .006) {
      const o = C.createOscillator(), g = C.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .8);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .05);
    }
    function hiss(C, t, dur, f0, f1, vol = .08, q = 1.3, type = 'bandpass') {
      const s = C.createBufferSource(), bf = C.createBiquadFilter(), g = C.createGain(); s.buffer = noise(C); bf.type = type; bf.Q.value = q;
      bf.frequency.setValueAtTime(f0, t); bf.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .45); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(bf).connect(g).connect(C.destination); s.start(t); s.stop(t + dur + .05);
    }
    const at = (ms, fn) => { const C = ready(); if (C) try { fn(C, C.currentTime + .01 + ms / 1000); } catch (e) {} };
    return {
      get on() { return on; },
      set(v) { on = !!v; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); },
      sync() { if (A_.sfxOn) on = A_.sfxOn(); },
      boing: (ms = 0) => at(ms, (C, t) => { tone(C, t, 150, 520, .26, 'triangle', .16); tone(C, t + .015, 300, 1040, .2, 'sine', .04); }),   // squash → spring up
      whoosh: (ms = 0, d = .2) => at(ms, (C, t) => hiss(C, t, d, 420, 2400, .07)),                                                          // one spin
      tok: (ms = 0) => at(ms, (C, t) => { tone(C, t, 520, 260, .08, 'sine', .1, .002); }),
      clack: (ms = 0) => at(ms, (C, t) => { const f = 420 + Math.random() * 360; tone(C, t, f, f * .55, .06, 'sine', .045, .002); }),   // one of many capsules knocking (random pitch so a burst never phases)                                                  // landing / roulette tick
      pop: (ms = 0) => at(ms, (C, t) => { tone(C, t, 880, 120, .14, 'sine', .24, .002); hiss(C, t, .22, 2600, 300, .14, .7, 'lowpass'); }),   // the icon bursts
      shimmer: (ms = 0) => at(ms, (C, t) => [1568, 2093, 2637, 3136, 2349, 2794, 3520, 4186].forEach((f, i) => tone(C, t + i * .04, f, 0, .38, 'sine', .03, .003))),
      chime: (ms = 0) => at(ms, (C, t) => [[784, 0], [988, .08], [1175, .16], [1568, .26]].forEach(([f, d]) => tone(C, t + d, f, 0, .7, 'sine', .06, .01))),   // the board is here
      coin: (ms = 0) => at(ms, (C, t) => { tone(C, t, 1319, 0, .09, 'square', .025, .002); tone(C, t + .07, 1976, 0, .3, 'square', .025, .002); }),
      // end of a game on the table: a bright victory jingle with a sparkle, a soft falling "aww" for a loss, two even notes for a draw
      win: (ms = 0) => at(ms, (C, t) => {
        [[523, 0, .16], [659, .12, .16], [784, .24, .16], [1047, .36, .5], [988, .62, .14], [1047, .76, .7]].forEach(([f, d, l]) => { tone(C, t + d, f, 0, l + .25, 'triangle', .1); tone(C, t + d, f * 2, 0, l, 'sine', .025); tone(C, t + d, f / 2, 0, l + .2, 'sine', .04); });
        [2093, 2637, 3136, 4186, 3520, 4699].forEach((f, i) => tone(C, t + .9 + i * .05, f, 0, .45, 'sine', .022, .003));
      }),
      lose: (ms = 0) => at(ms, (C, t) => {
        [[392, 0], [370, .26], [349, .52]].forEach(([f, d]) => { tone(C, t + d, f, f * .985, .34, 'triangle', .08); tone(C, t + d, f / 2, 0, .4, 'sine', .035); });
        tone(C, t + .8, 330, 196, 1.0, 'triangle', .08); tone(C, t + .8, 165, 98, 1.1, 'sine', .04);   // the last note sags down
      }),
      draw: (ms = 0) => at(ms, (C, t) => { [[523, 0], [659, .18]].forEach(([f, d]) => tone(C, t + d, f, 0, .5, 'triangle', .08)); tone(C, t + .4, 587, 0, .7, 'sine', .05); }),
      fanfare: (ms = 0) => at(ms, (C, t) => [[523, 0], [659, .1], [784, .2], [1047, .32]].forEach(([f, d]) => { tone(C, t + d, f, 0, .45, 'triangle', .09); tone(C, t + d, f * 2, 0, .3, 'sine', .02); })),
    };
  })();
  const SPK = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor"/>';
  function sfxIcon() {
    const b = $('sfxBtn'); if (!b) return; SFX.sync();
    b.innerHTML = `<svg viewBox="0 0 24 24">${SPK}${SFX.on ? '<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'}</svg>`;
    b.setAttribute('aria-pressed', SFX.on); b.classList.toggle('off', !SFX.on); b.setAttribute('aria-label', t(SFX.on ? 'sfx.on' : 'sfx.off')); b.title = t(SFX.on ? 'sfx.on' : 'sfx.off');
  }
  $('sfxBtn').onclick = () => { SFX.set(!SFX.on); sfxIcon(); toast(t(SFX.on ? 'sfx.on' : 'sfx.off')); if (SFX.on) SFX.coin(); };
  // 「キャラ会話」 on / off (the AI games' boss and watcher talk, atlas/npc/npc.js — the same switch as the full versions' options)
  function npcIcon() {
    const b = $('npcBtn'), N = window.AtlasNPC; if (!b || !N || !N.on) return;
    const on = N.on(), l = (N.LABEL[lang] || N.LABEL.en) + ' : ' + t(on ? 'npc.on' : 'npc.off');
    b.innerHTML = N.ICON.replace('</svg>', on ? '</svg>' : '<path d="M4 4l16 16" stroke-width="2.2"/></svg>');
    b.setAttribute('aria-pressed', on); b.classList.toggle('off', !on); b.setAttribute('aria-label', l); b.title = l;
  }
  if ($('npcBtn')) $('npcBtn').onclick = () => { const N = window.AtlasNPC; if (!N || !N.on) return; N.setOn(!N.on()); npcIcon(); toast($('npcBtn').title); };

  /* ---------- tabs ---------- */
  const ICO = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    games: '<rect x="3" y="7" width="18" height="11" rx="5.5"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.8" r="1" fill="currentColor"/>',
    ach: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
    shop: '<path d="M4 9h16l-1.5 11h-13z"/><path d="M8.5 9a3.5 3.5 0 0 1 7 0"/>',
    gacha: '<circle cx="12" cy="9.5" r="6.5"/><path d="M6 15h12v5H6zM5.5 9.5h13"/><circle cx="12" cy="17.5" r="1.2" fill="currentColor"/>',
    dress: '<path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z"/>',
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  };
  const TABS = ['home', 'games', 'map', 'ach', 'gacha', 'dress'];   // ショップはガチャのページの下段（2026-11-06）。#shop はガチャへ
  const tabsEl = $('tabs');
  TABS.forEach(k => {
    const b = document.createElement('button'); b.className = 'tab'; b.role = 'tab'; b.dataset.k = k;
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg><span></span>`;
    b.onclick = () => go(k); tabsEl.appendChild(b);
  });
  let page = 'home';
  // phones: the gacha page has two tabs, ガチャ and ショップ (html[data-gs]); PC shows both, the shop below the gacha
  function gsSet(v) { document.documentElement.dataset.gs = v; document.querySelectorAll('#gsSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); }
  document.querySelectorAll('#gsSeg button').forEach(b => b.onclick = () => { gsSet(b.dataset.v); if (b.dataset.v === 'gacha' && !busy) renderGacha(); window.scrollTo({ top: 0 }); });
  function go(k, push = true) {
    const toShop = k === 'shop'; if (toShop) k = 'gacha';
    if (k === 'gacha') gsSet(toShop ? 'shop' : 'gacha');   // phones: the ガチャ｜ショップ tabs of the page
    if (!TABS.includes(k)) k = 'home';
    page = k; propWake(); document.documentElement.dataset.pg = k;   // (phones: the updates ticker hides on the map and きせかえ)
    tabsEl.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
    document.querySelectorAll('section.pg').forEach(s => s.classList.toggle('on', s.id === 'pg-' + k));
    if (push) history.replaceState(null, '', '#' + k);
    render(k);
    if (toShop && !isPhone()) requestAnimationFrame(() => $('shopSec').scrollIntoView({ behavior: push ? 'smooth' : 'auto', block: 'start' }));
    else if (push) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- common renderers ---------- */
  const R3 = new Set(['reversi', 'shogi', 'chess', 'gomoku', 'dots', 'connect4', 'mancala', 'backgammon', 'morris', 'sudoku', 'speedsudoku', 'checkers', 'samegame', 'go', 'hex', 'tafl', 'xiangqi', 'jailbreak', 'solitaire', 'poker', 'baccarat', 'blackjack', 'fanorona', 'alquerque', 'ur', 'ugolki', 'agon', 'konane', 'senet', 'janggi', 'ludo', 'carrom', 'crokinole', 'hockey', 'amazons']);   // images/atlas/<id>.webp exists
  const artSrc = g => R3.has(g.id) ? `../images/atlas/${g.id}.webp?v=${g.id === 'fanorona' || g.id === 'janggi' ? 11 : 10}` : `../${g.icon}`;
  const artImg = (g, extra = '') => `<img src="${artSrc(g)}" alt="" loading="lazy" decoding="async"${R3.has(g.id) ? '' : ' class="flat"'}${extra}>`;
  const g3 = g => `<span class="g3" style="--c:${g.color}">${artImg(g)}</span>`;
  const gno = g => 'No.' + String(A_.GAMES.indexOf(g) + 1).padStart(2, '0');
  function tagHtml(k) { const T = A_.TAGS[k]; return `<span class="tag" style="--c:${T.c}"><svg viewBox="0 0 24 24"><path d="${T.i}"/></svg>${esc(t('tag.' + k))}</span>`; }
  function badgeHtml(b) { return `<span class="badge ${b}">${esc(A_.badgeText ? A_.badgeText(b, lang) : { new: 'NEW', update: 'UPDATE', beta: 'BETA', original: 'ORIGINAL' }[b] || '')}</span>`; }
  function ring(pct, col) {
    const r = 22, c = 2 * Math.PI * r;
    return `<span class="ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#efe8d6" stroke-width="6"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * pct / 100} ${c}"/></svg>${pct}%</span>`;
  }
  function medalSvg(tier) {
    const c = [['#e8a46a', '#b8703a'], ['#e3e8f0', '#9aa6b8'], ['#ffd84d', '#d79a1c'], ['#c9f1ff', '#7f8cff']][tier];
    return `<svg class="medal" viewBox="0 0 46 46"><path d="M14 2h7l4 14h-7zM32 2h-7l-4 14h7z" fill="${tier === 3 ? '#a17cff' : '#ff6b6b'}"/><circle cx="23" cy="28" r="15" fill="${c[1]}"/><circle cx="23" cy="27" r="13" fill="${c[0]}"/><path d="M23 19l2.4 5l5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" opacity=".85"/></svg>`;
  }
  function achText(a) { return t('a.' + a.key, { n: a.n != null ? a.n.toLocaleString() : '' }); }
  function achHtml(a) {
    const g = a.gid && A_.GAMES.find(x => x.id === a.gid);
    return `<div class="card ach ${a.done ? '' : 'todo'}">${medalSvg(a.tier)}<div class="tx"><div class="t1">${g ? `<img class="gi" src="../${g.icon}" alt="">` : ''}${esc(achText(a))}</div>
      <div class="t2"><span class="bar"><i style="width:${a.have / a.need * 100}%;--c:${a.done ? 'var(--mint)' : 'var(--sun)'}"></i></span>${a.have.toLocaleString()}/${a.need.toLocaleString()}</div></div>
      <span class="rw"><i></i>${A_.TIER_COINS[a.tier]}</span></div>`;
  }
  /* ---------- 戦績 (records): every game's record page, opened from its card ----------
     The full games keep their finished games in localStorage 'atlas-rec-<id>' (shared/record.js GameRecord); the portal's 3D
     table adds to the same list (via: '3d'). The page shows the totals, the win rate, streaks, the record by opponent, the recent
     games, the game's other progress (puzzles, lessons…) and its achievements (2026-11-09). */
  const recLoad = id => { try { const a = JSON.parse(localStorage.getItem('atlas-rec-' + id) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  function recPush(id, r) { try { const a = recLoad(id); a.push(Object.assign({ t: Date.now() }, r)); localStorage.setItem('atlas-rec-' + id, JSON.stringify(a.slice(-500))); } catch (e) {} }
  let recMode = 'all', recTab = 'rec';
  function openRec(g) {
    let ov = $('recOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'recOv'; ov.className = 'recov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov);
      ov.addEventListener('click', e => { if (e.target === ov) closeRec(); });
      addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('on')) closeRec(); }); }
    recMode = 'all'; recTab = 'rec'; renderRec(g); requestAnimationFrame(() => ov.classList.add('on'));
  }
  function closeRec() { const ov = $('recOv'); if (ov) ov.classList.remove('on'); }
  function renderRec(g) {
    const ov = $('recOv'), all = recLoad(g.id).filter(r => r && r.res && r.mode !== 'pvp');
    const versus = all.length || (g.tags || []).some(x => x === 'ai' || x === 'online' || x === 'rated') || !!(window.Atlas3D && Atlas3D[g.id]) || !!(window.AtlasLazy && AtlasLazy.hasPlay(g.id));   // a game with opponents (puzzles / solo games: no empty record box)
    const has = { ai: all.some(r => r.mode === 'ai'), rated: all.some(r => r.mode === 'rated'), online: all.some(r => r.mode === 'online'), t3d: all.some(r => r.via === '3d') };
    const L = recMode === 'all' ? all : recMode === 't3d' ? all.filter(r => r.via === '3d') : all.filter(r => r.mode === recMode);
    const n = { w: 0, l: 0, d: 0 }; L.forEach(r => { n[r.res] = (n[r.res] || 0) + 1; });
    const tot = n.w + n.l + n.d, wr = tot ? Math.round(n.w / Math.max(1, n.w + n.l) * 100) : 0;
    let cur = 0, best = 0, run = 0; L.forEach(r => { if (r.res === 'w') { run++; best = Math.max(best, run); } else if (r.res === 'l') run = 0; }); cur = run;
    // by opponent (AI levels in order, then rated, online)
    const by = new Map(); L.forEach(r => { const k = r.key || r.opp || '?'; const e = by.get(k) || { k, opp: r.opp || k, w: 0, l: 0, d: 0, t: 0 }; e[r.res]++; e.opp = r.opp || e.opp; e.t = r.t; by.set(k, e); });
    const ord = k => { const m = /^(ai|rt|ol):(\d+)/.exec(k); return (k.startsWith('ai') ? 0 : k.startsWith('rt') ? 1e4 : 2e4) + (m ? +m[2] : 999); };
    const opps = [...by.values()].sort((a, b) => ord(a.k) - ord(b.k)).slice(0, 30);
    const R = 34, C = 2 * Math.PI * R;
    const chip = (k, on) => `<button type="button" class="chip" aria-pressed="${recMode === k}" data-m="${k}" ${on ? '' : 'hidden'}>${esc(t('rec.m.' + k))}</button>`;
    const resChip = r => `<span class="rres ${r}">${esc(t('rec.' + r))}</span>`;
    const dt = ts => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const pr = P[g.id] || {}, tiles = [];
    if (g.total.pz) tiles.push([t('pg.pz'), (pr.pz || 0).toLocaleString(), '/ ' + g.total.pz.toLocaleString()]);
    if (g.total.ls) tiles.push([t('pg.ls'), pr.ls || 0, '/ ' + g.total.ls]);
    if (pr.rt && pr.rt.n) tiles.push([t('pg.rt'), pr.rt.r != null ? pr.rt.r : pr.rt.n, pr.rt.r != null ? t('rec.games', { n: pr.rt.n }) : '']);
    if (pr.dl && pr.dl.days) tiles.push([t('pg.dl'), t('pg.days', { n: pr.dl.days }), pr.dl.best ? t('rec.bestRun', { n: pr.dl.best }) : '']);
    if (pr.hd) tiles.push([t('rec.hands'), pr.hd.toLocaleString(), '']);
    if (pr.sw) tiles.push([t('rec.solved'), pr.sw.toLocaleString(), '']);
    if (pr.p3 && pr.p3.n) tiles.push([t('rec.m.t3d'), t('rec.wins', { n: pr.p3.w }), pr.p3.best ? t('rec.bestLv', { n: pr.p3.best }) : '']);
    const achs = ACH.filter(a => a.gid === g.id).sort((a, b) => (b.done - a.done) || (a.done ? b.tier - a.tier : (b.have / b.need) - (a.have / a.need)));
    const ad = achs.filter(a => a.done).length;
    // three tabs along the bottom: 戦績 (the games) · あそびの記録 (progress) · 実績 (achievements) — only those with something to show
    const tabs = [['rec', '🏆', t('rec.title'), versus], ['play', '📊', t('rec.play'), tiles.length], ['ach', '🏅', t('tab.ach'), achs.length]].filter(x => x[3]);
    if (!tabs.some(x => x[0] === recTab)) recTab = tabs.length ? tabs[0][0] : 'rec';
    const modes = [['all', 1], ['ai', has.ai], ['rated', has.rated], ['online', has.online], ['t3d', has.t3d]].filter(x => x[1]).map(x => x[0]);
    const recHtml = all.length ? `${modes.length > 1 ? `<div class="rdd"><button type="button" class="rddb" aria-haspopup="listbox" aria-expanded="false"><span>${esc(t('rec.m.' + recMode))}</span><i>▾</i></button><div class="rddl" role="listbox" hidden>${modes.map(k => `<button type="button" role="option" data-m="${k}" class="${k === recMode ? 'on' : ''}">${esc(t('rec.m.' + k))}</button>`).join('')}</div></div>` : ''}
        <section class="rsum card">
          <span class="rring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${R}" fill="none" stroke="#efe8d6" stroke-width="9"/><circle cx="40" cy="40" r="${R}" fill="none" stroke="${g.color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C * wr / 100} ${C}" transform="rotate(-90 40 40)"/></svg><b>${wr}<i>%</i></b><em>${esc(t('rec.rate'))}</em></span>
          <div class="rnums"><div class="w"><b>${n.w}</b><span>${esc(t('rec.w'))}</span></div><div class="l"><b>${n.l}</b><span>${esc(t('rec.l'))}</span></div><div class="d"><b>${n.d}</b><span>${esc(t('rec.d'))}</span></div></div>
          <div class="rmeta"><span>${esc(t('rec.games', { n: tot }))}</span><span>🔥 ${esc(t('rec.streak', { n: cur }))}</span><span>👑 ${esc(t('rec.best', { n: best }))}</span></div>
          <div class="rform">${L.slice(-15).map(r => `<i class="${r.res}"></i>`).join('')}</div>
        </section>
        <h4>${esc(t('rec.byOpp'))}</h4>
        <div class="ropps card">${opps.map(e => `<div class="ro"><span class="rn">${esc(e.opp)}</span><span class="rbar"><i class="w" style="flex:${e.w}"></i><i class="d" style="flex:${e.d}"></i><i class="l" style="flex:${e.l}"></i></span><span class="rc"><b>${e.w}</b>-${e.l}${e.d ? '-' + e.d : ''}</span></div>`).join('')}</div>
        <h4>${esc(t('rec.recent'))}</h4>
        <div class="rlist card">${L.slice(-20).reverse().map(r => `<div class="rr">${resChip(r.res)}<span class="ro2"><b>${esc(r.opp || '')}</b><small>${esc([r.vn, r.why, r.n ? t('rec.moves', { n: r.n }) : ''].filter(Boolean).join(' · '))}</small></span><span class="rm">${r.via === '3d' ? '🎲 ' : ''}${esc(t('rec.m.' + (r.mode === 'rated' ? 'rated' : r.mode === 'online' ? 'online' : 'ai')))}<small>${dt(r.t)}</small></span></div>`).join('')}</div>`
      : `<div class="rempty card"><span>🏆</span><p>${esc(t('rec.none'))}</p></div>`;
    const body = recTab === 'rec' ? recHtml
      : recTab === 'play' ? `<div class="rtiles">${tiles.map(([k, v, s2]) => `<div class="card rt"><small>${esc(k)}</small><b>${esc(String(v))}</b><span>${esc(String(s2 || ''))}</span></div>`).join('')}</div>`
      : `<div class="rachs"><b>${ad}</b> / ${achs.length}<span class="bar"><i style="width:${achs.length ? ad / achs.length * 100 : 0}%;--c:var(--mint)"></i></span></div><div class="rach">${achs.map(achHtml).join('')}</div>`;
    ov.innerHTML = `<div class="recp" style="--c:${g.color}">
      <div class="rhd">${g3(g)}<div class="rtt"><small>${esc(t('rec.title'))}</small><h3>${esc(gname(g))}</h3></div><button type="button" class="rx" aria-label="${esc(t('bv.close'))}">×</button></div>
      <div class="rbd">${body}</div>
      ${tabs.length > 1 ? `<nav class="rtabs" role="tablist">${tabs.map(([k, ic, lb]) => `<button type="button" role="tab" aria-selected="${k === recTab}" data-tab="${k}"><span>${ic}</span><b>${esc(lb)}</b></button>`).join('')}</nav>` : ''}
    </div>`;
    ov.querySelector('.rx').onclick = closeRec;
    ov.querySelectorAll('.rtabs [data-tab]').forEach(b => b.onclick = () => { if (recTab === b.dataset.tab) return; recTab = b.dataset.tab; try { SFX.tap && SFX.tap(); } catch (e) {} renderRec(g); });
    const dd = ov.querySelector('.rdd');
    if (dd) { const bt = dd.querySelector('.rddb'), ls = dd.querySelector('.rddl');
      bt.onclick = e => { e.stopPropagation(); const op = ls.hidden; ls.hidden = !op; bt.setAttribute('aria-expanded', String(op)); };
      ls.onclick = e => { const b = e.target.closest('[data-m]'); if (b) { recMode = b.dataset.m; renderRec(g); } };
      ov.querySelector('.recp').addEventListener('click', e => { if (!dd.contains(e.target)) { ls.hidden = true; bt.setAttribute('aria-expanded', 'false'); } }); }
  }
  function itemCard(it, foot, extraCls = '') {
    return `<div class="card item r${it.rar} ${extraCls}" data-kind="${it.kind}" data-id="${it.id}"><span class="rar">${ART.RAR[it.rar]}</span>
      <div class="art">${ART.svg(it.id)}</div><div class="nm">${esc(iname(it))}</div><div class="kd">${t('kind.' + it.kind)}</div>${foot || ''}</div>`;
  }
  function avatar(size) { return ART.avatar(W.av, size); }

  /* ---------- HOME ---------- */
  const GLOGO = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  function renderAcc() {   // Google sign-in / account state, in every .accw host (home profile card, My Page on きせかえ)
    if (!window.AtlasAccount) return;
    const s = AtlasAccount.state(), when = s.last ? new Date(s.last).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '';
    document.querySelectorAll('.accw').forEach(host => {
      let el = host.querySelector('.acc'); if (!el) { el = document.createElement('div'); el.className = 'acc'; host.appendChild(el); }
      el.title = '';
      if (!s.available) { el.innerHTML = `<span>🔒 ${t('acc.soon')}</span>`; el.title = t('acc.note'); return; }
      if (!s.user) { el.innerHTML = `<button class="gbtn" title="${esc(t('acc.note'))}">${GLOGO}${t('acc.in')}</button>`; el.querySelector('.gbtn').onclick = () => AtlasAccount.signIn(); return; }
      el.innerHTML = `${s.user.photo ? `<img src="${esc(s.user.photo)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(s.user.email || s.user.name)}</span>
      <span class="${s.err ? '' : 'ok'}">${s.syncing ? t('acc.syncing') : s.err ? t('acc.err') : '✓ ' + t('acc.synced') + ' ' + when}</span><button class="btn sm ghost">${t('acc.out')}</button>`;
      el.querySelector('.btn').onclick = () => AtlasAccount.signOut();
    });
  }
  if (window.AtlasAccount) {
    AtlasAccount.on(() => renderAcc());
    window.addEventListener('atlas-synced', () => { W = A_.load(); refresh(); if (!session) render(page); });
    // when the name changes, fill it in from Google if empty
    AtlasAccount.on(st => { if (st.user && !W.name && st.user.name) { W.name = st.user.name.slice(0, 16); A_.save(W); if (A_.shareName) A_.shareName(W.name, true); ['nameIn', 'dpName'].forEach(id => { const ni = $(id); if (ni) ni.value = W.name; }); } });
  }
  // floating toy pieces around the title: [piece image, game, x%, y%, width px, rotation]
  // the pieces floating round the title: one signature piece per game (the first 11 are the ones phones show)
  const PROPS = [['shogi', 'shogi', 22, 14, 84, 8], ['knightB', 'chess', 6, 70, 96, 0], ['disc', 'reversi', 20, 84, 104, -6], ['xq', 'xiangqi', 92, 20, 86, 10],
    ['stoneB', 'go', 33, 92, 70, 0], ['die', 'backgammon', 9, 22, 92, -12], ['king', 'checkers', 80, 88, 88, -8], ['card', 'solitaire', 95, 64, 86, 10],
    ['gzhel', 'ugolki', 61, 8, 74, 0], ['urPiece', 'ur', 66, 92, 80, 6], ['c4', 'connect4', 3, 45, 80, -14],
    ['agonQueen', 'agon', 45, 10, 66, 0], ['woodBall', 'fanorona', 78, 10, 58, 0], ['taflKing', 'tafl', 97, 40, 72, 0], ['chip', 'poker', 50, 95, 66, 0],
    ['gem', 'mancala', 33, 9, 50, 0], ['tile', 'sudoku', 89, 82, 58, 10], ['block', 'samegame', 12, 95, 56, -8], ['coin', 'alquerque', 14, 36, 52, 0],
    ['hexRed', 'hex', 87, 32, 50, 0], ['key', 'jailbreak', 73, 22, 56, 0], ['dotBar', 'dots', 27, 26, 56, 0], ['cardH', 'baccarat', 86, 58, 60, -10],
    ['stoneW', 'gomoku', 4, 9, 54, 0], ['checker', 'morris', 15, 60, 58, -8], ['gzhelB', 'ugolki', 97, 92, 50, 0]];
  // title emblem: a compass seal (the "atlas") with ring lettering and a swallow-tail ribbon
  const TF = 'RocknRoll One';   // title face: characterful but stays legible (Dela Gothic crushed the dakuten)
  function emblem(main, pre, n) {
    const ring = 'WORLD BOARD GAME ATLAS ✦ 世界のボドゲ大百科 ✦ WORLD BOARD GAME ATLAS ✦ 世界のボドゲ大百科 ✦ ';
    const cjk = /[\u3000-\u9fff\uac00-\ud7af]/.test(main);
    const big = cjk ? (main.length <= 5 ? 76 : Math.max(30, Math.round(380 / (main.length * .92)))) : 56;   // (Latin etc.: start large, fitTitle shrinks it to the ribbon)
    const pts = (len, w) => [0, 90, 180, 270].map(a => `<path d="M320 ${200 - len}L${320 + w} 200H${320 - w}z" transform="rotate(${a} 320 200)"/>`).join('');
    return `<svg viewBox="0 0 640 400" role="img" aria-hidden="true">
      <defs><path id="ringP" d="M320 200m-153 0a153 153 0 1 1 306 0a153 153 0 1 1-306 0"/></defs>
      <circle cx="320" cy="200" r="176" fill="#111"/>
      <g><animateTransform attributeName="transform" type="rotate" from="0 320 200" to="360 320 200" dur="20s" repeatCount="indefinite"/><text font-family="Fredoka,'Zen Maru Gothic',sans-serif" font-weight="700" font-size="15.5" letter-spacing="3.2" fill="#fff"><textPath href="#ringP" textLength="955" lengthAdjust="spacing">${ring}</textPath></text></g>
      <circle cx="320" cy="200" r="136" fill="#fff"/>
      <circle cx="320" cy="200" r="128" fill="none" stroke="#111" stroke-width="2" stroke-dasharray="3 5"/>
      <g fill="#111" opacity=".16">${pts(118, 22)}</g>
      <g fill="#111" transform="rotate(45 320 200)" opacity=".1">${pts(92, 16)}</g>
      <g fill="#111">${[0, 90, 180, 270].map(a => `<path d="M320 ${200 - 124}L320 200H${320 - 22}z" transform="rotate(${a} 320 200)"/>`).join('')}</g>
      <!-- ribbon -->
      <path d="M40 160H600L580 205L600 250H40L60 205Z" fill="#111" transform="translate(8 8)"/>
      <path d="M40 160H600L580 205L600 250H40L60 205Z" fill="#fff" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
      <path d="M86 172H554M86 238H554" stroke="#111" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
      ${pre ? `<rect class="ttlPreBox" x="268" y="112" width="104" height="38" rx="6" fill="#111"/><text class="ttlPre" x="320" y="139" text-anchor="middle" font-family="'${TF}',sans-serif" font-size="22" letter-spacing="1" fill="#fff">${esc(pre)}</text>` : ''}
      <text class="ttlMain" x="320" y="${205 + big * .36}" text-anchor="middle" font-family="'${TF}','Zen Maru Gothic',sans-serif" font-size="${big}" fill="#111" letter-spacing="${Math.round(big * .05)}">${esc(main)}</text>
      <g transform="translate(320 286)"><rect x="-66" y="-17" width="132" height="34" rx="17" fill="#111"/><text y="8" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="22" fill="#fff">${n}<tspan font-family="Fredoka,sans-serif" font-weight="700" font-size="13" dx="6" letter-spacing="2">GAMES</tspan></text></g>
      <!-- piece tips on the compass -->
      <g fill="#fff" stroke="#111" stroke-width="4">
        <g transform="translate(320 72) scale(.8)"><circle r="13"/><path d="M-12 30h24l-4-14h-16z"/></g>
        <g class="ttlTip" transform="translate(412 112) rotate(14) scale(.8)"><rect x="-15" y="-15" width="30" height="30" rx="7"/><circle cx="-6" cy="-6" r="2.6" fill="#111" stroke="none"/><circle cx="6" cy="6" r="2.6" fill="#111" stroke="none"/></g>
        <g class="ttlTip" transform="translate(228 112) rotate(-10) scale(.8)"><path d="M0-19l13 6 4 30h-34l4-30z"/></g>
      </g>
    </svg>`;
  }
  // SVG text doesn't always trigger web-font loading (iOS Safari) → load the title face explicitly, then redraw
  let tfReady = false;
  if (document.fonts && document.fonts.load) document.fonts.load(`40px "${TF}"`, 'ボドゲ大百科世界の').then(() => { tfReady = true; if (page === 'home') renderHero(true); }).catch(() => {});
  // the ribbon title must stay inside the ribbon in every language: measure it and shrink the font (never squeeze the glyphs)
  function fitTitle() {
    const pt = $('ttl').querySelector('.ttlPre'), pb = $('ttl').querySelector('.ttlPreBox');
    if (pt && pb && pt.getComputedTextLength) { const w = pt.getComputedTextLength(); if (w > 0) { const bw = Math.max(104, Math.round(w + 32)); pb.setAttribute('width', bw); pb.setAttribute('x', 320 - bw / 2); $('ttl').querySelectorAll('.ttlTip').forEach(g => g.style.display = bw > 150 ? 'none' : ''); } }   // (a wide tag would cover the piece and die tips beside it)
    const tx = $('ttl').querySelector('.ttlMain'); if (!tx || !tx.getComputedTextLength) return;
    const MAX = 430;   // (the ribbon's inner width between the dotted lines is 468)
    let fs = parseFloat(tx.getAttribute('font-size'));
    for (let i = 0; i < 4; i++) {
      const w = tx.getComputedTextLength(); if (!(w > MAX)) break;
      fs = Math.max(18, Math.floor(fs * MAX / w * 10) / 10);
      tx.setAttribute('font-size', fs); tx.setAttribute('letter-spacing', Math.round(fs * .05)); tx.setAttribute('y', (205 + fs * .36).toFixed(1));
    }
  }
  function renderHero(titleOnly) {
    const ja = lang === 'ja', phone = innerWidth < 760;
    // long titles put their first part in the tag above the ribbon (like 世界の in Japanese), so the ribbon keeps big letters
    const SPLIT = { ja: ['世界の', 'ボドゲ大百科'], fr: ['ATLAS MONDIAL', 'Jeux de société'], es: ['ATLAS MUNDIAL', 'Juegos de Mesa'], pt: ['ATLAS MUNDIAL', 'Jogos de Tabuleiro'],
      de: ['WELT', 'Brettspiel-Atlas'], id: ['ATLAS DUNIA', 'Permainan Papan'], tr: ['DÜNYA ATLASI', 'Masa Oyunları'], ru: ['АТЛАС', 'Настольные игры'],
      zh: ['世界', '桌游大全'], 'zh-TW': ['世界', '桌遊大百科'], ko: ['세계의', '보드게임 대전'], hi: ['विश्व', 'बोर्ड गेम एटलस'] }[lang];
    $('ttl').innerHTML = emblem(SPLIT ? SPLIT[1] : t('title'), SPLIT ? SPLIT[0] : '', A_.GAMES.length);
    $('ttl').setAttribute('aria-label', t('title') + ' — World Board Game Atlas');
    fitTitle();
    if (titleOnly && $('props').childElementCount) return;   // (the font arrived: only the title is redrawn, the pieces keep floating)
    $('props').innerHTML = PROPS.filter((_, i) => !phone || i < 17).map(([img, gid, x, y, w, r], i) => `<span class="pp" data-g="${gid}" style="--x:${x}%;--y:${y}%;--w:${Math.round(w * (phone ? .44 : 1))}px;--r:${r}deg"><img src="../images/atlas/p-${img}.webp?v=2" alt="" decoding="async"></span>`).join('');
    $('props').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { hop(b, true); SFX.shimmer(60); SFX.chime(290); setTimeout(() => openBoard(b.dataset.g), 380); });   // (the sparkle a game icon ends on when its board appears)
    startProps();
  }
  /* floating pieces: bob + sway, random hops/spins, follow the pointer / phone tilt a little (JS, so it runs on every browser) */
  let propRaf = 0, px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma != null) { tx = Math.max(-.5, Math.min(.5, e.gamma / 60)); ty = Math.max(-.5, Math.min(.5, (e.beta - 40) / 80)); } }, { passive: true });
  function hop(el, big) { el._hop = performance.now(); el._big = !!big; }
  // the bob runs only while it can be seen (home page, tab shown and focused, no 3D board over it): otherwise the loop stops
  // (0 frames — battery) and propWake() starts it again when one of these changes
  let propStep = null, propObs = false, propVis = true;
  function propWake() { if (!propRaf && propStep) propRaf = requestAnimationFrame(propStep); }
  function startProps() {
    cancelAnimationFrame(propRaf); propRaf = 0;
    if (!propObs) { propObs = true;
      try { new IntersectionObserver(es => { propVis = es.some(e => e.isIntersecting); if (propVis) propWake(); }).observe($('props')); } catch (e) {}
      document.addEventListener('visibilitychange', propWake); addEventListener('focus', propWake);
      try { new MutationObserver(propWake).observe($('bv'), { attributes: true, attributeFilter: ['class'] }); } catch (e) {} }
    const els = [...$('props').querySelectorAll('.pp')];
    els.forEach((el, i) => { el._ph = i * 1.7; el._sp = .7 + (i % 5) * .12; el._r = parseFloat(el.style.getPropertyValue('--r')) || 0; el._z = .4 + (i % 4) * .2; });
    let nextHop = performance.now() + 1200;
    let lastP = 0;
    propStep = function step(now) {
      propRaf = 0;
      if (document.hidden || page !== 'home' || !els[0] || !els[0].isConnected || !document.hasFocus() || $('bv').classList.contains('on') || !propVis) return;   // (stopped: see propWake; also while the hero is scrolled out of view, 2026-11-10)
      propRaf = requestAnimationFrame(step);
      // 60 fps while a piece hops or the pointer / tilt moves them, 30 fps for the slow idle bob; stopped while the window isn't focused
      const busy = els.some(e => e._hop) || Math.abs(tx - px) > .002 || Math.abs(ty - py) > .002;
      if (now - lastP < 1000 / (busy ? 60 : 30) - 2) return;
      lastP = now;
      px += (tx - px) * .06; py += (ty - py) * .06;
      if (now > nextHop) { hop(els[Math.random() * els.length | 0]); nextHop = now + 900 + Math.random() * 1400; }
      const t = now / 1000;
      els.forEach(el => {
        let y = Math.sin(t * el._sp + el._ph) * 10, r = el._r + Math.sin(t * el._sp * .8 + el._ph) * 7, sc = 1, sy = 1;
        if (el._hop) {
          const k = (now - el._hop) / (el._big ? 650 : 900);
          if (k >= 1) el._hop = 0;
          else {
            y -= Math.sin(k * Math.PI) * (el._big ? 46 : 34);
            r += (el._big ? 360 : 360 * (el._ph % 2 > 1 ? 1 : -1)) * (1 - Math.pow(1 - k, 3)) % 360;
            if (k < .12) { sy = 1 - k * 2; sc = 1 + k; } else if (k > .88) { sy = 1 - (1 - k) * 1.6; }
          }
        }
        const ox = -px * 26 * el._z, oy = -py * 18 * el._z;
        el.style.transform = `translate(calc(-50% + ${ox.toFixed(1)}px), calc(-50% + ${(y + oy).toFixed(1)}px)) rotate(${r.toFixed(1)}deg) scale(${sc.toFixed(3)}, ${(sc * sy).toFixed(3)})`;
      });
    };
    propStep(performance.now());
  }
  // after load, in idle time: start the 3D table, then build every board ahead of time (one per idle slice),
  // so tapping an icon never has to build a board while the fly / smoke / sparkle effects are playing
  const idle = window.requestIdleCallback ? (f => requestIdleCallback(f, { timeout: 2500 })) : (f => setTimeout(f, 300));
  // (none of this runs while a popup / confetti is up: building the table and compiling shaders is long main-thread work
  // that made the login-bonus confetti hitch)
  const fxBusy = () => CF.run || $('ov').classList.contains('on');
  const boot = () => idle(() => {
    if (!glOK && fxBusy()) return setTimeout(boot, 700);
    if (!glOK) initGL(); if (!glOK) return;
    const q = A_.byUpdate().map(g => g.id);
    const next = () => { if (!q.length) return; idle(() => { const id = q.shift(); if ($('bv').classList.contains('on') || flying || fxBusy()) { q.unshift(id); return setTimeout(next, 600); } try { warm(id); } catch (e) {} if (TG) TG.idle([id]).then(next); else next(); }); };
    setTimeout(next, 400);
  });
  boot();
  // ‹ › buttons page the recent-updates row (one card step; hidden at either end)
  function updNav() {
    const row = $('updRow'), pv = $('updPrev'), nx = $('updNext'); if (!row || !pv) return;
    const rtl = getComputedStyle(row).direction === 'rtl';
    const step = () => { const c = row.querySelector('.ut'); return c ? c.offsetWidth + 16 : row.clientWidth * .8; };
    const sync = () => { const max = row.scrollWidth - row.clientWidth - 2, x = Math.abs(row.scrollLeft); pv.hidden = x < 10; nx.hidden = x >= max - 8; };
    pv.onclick = () => row.scrollBy({ left: (rtl ? 1 : -1) * step(), behavior: 'smooth' });
    nx.onclick = () => row.scrollBy({ left: (rtl ? -1 : 1) * step(), behavior: 'smooth' });
    row.onscroll = () => requestAnimationFrame(sync);
    if (!updNav.ro && window.ResizeObserver) { updNav.ro = new ResizeObserver(() => sync()); updNav.ro.observe(row); }
    sync(); setTimeout(sync, 300);
  }
  // portal features that can appear in the recent-updates row (UPDATES lines with the id tab:<page>)
  const FEAT = { gacha: { color: '#e0567a', art: '../images/atlas/av/boss-chess-9-3.webp?v=1' }, map: { color: '#2f86d6', art: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20120%20100%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22o%22%20cx%3D%22.38%22%20cy%3D%22.32%22%20r%3D%22.8%22%3E%3Cstop%20offset%3D%220%22%20stop-color%3D%22%238fd3ff%22/%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%232f86d6%22/%3E%3C/radialGradient%3E%3CclipPath%20id%3D%22c%22%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2254%22%20r%3D%2238%22/%3E%3C/clipPath%3E%3C/defs%3E%3Cellipse%20cx%3D%2260%22%20cy%3D%2295%22%20rx%3D%2230%22%20ry%3D%224%22%20fill%3D%22%23000%22%20opacity%3D%22.18%22/%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2254%22%20r%3D%2238%22%20fill%3D%22url%28%23o%29%22/%3E%3Cg%20clip-path%3D%22url%28%23c%29%22%20fill%3D%22%23f6e3b0%22%3E%3Cpath%20d%3D%22M20%2030c8-6%2020-8%2026-2%204%204%200%2010%206%2014%205%203%204%2010-2%2012-7%203-8%2012-14%2012-6%200-6-8-12-10-6-2-10-8-8-14%201-5%201-9%204-12z%22/%3E%3Cpath%20d%3D%22M62%2020c10-3%2026%200%2034%208%206%206%204%2014-2%2016-6%202-8%208-14%208s-6-8-12-8-10-4-10-10%200-12%204-14z%22/%3E%3Cpath%20d%3D%22M70%2062c6-2%2014%202%2016%208%202%207-4%2014-10%2016-6%201-8-6-10-12-2-5-1-10%204-12z%22/%3E%3C/g%3E%3Ccircle%20cx%3D%2260%22%20cy%3D%2254%22%20r%3D%2238%22%20fill%3D%22none%22%20stroke%3D%22%231f5fa0%22%20stroke-width%3D%222.4%22/%3E%3Cpath%20d%3D%22M44%2030a26%2026%200%200%201%2012-8%22%20fill%3D%22none%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20opacity%3D%22.55%22/%3E%3Cg%3E%3Cpath%20d%3D%22M38%2044c0-6%204-10%209-10s9%204%209%2010c0%207-9%2014-9%2014s-9-7-9-14z%22%20fill%3D%22%23ff5d5d%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222.2%22/%3E%3Ccircle%20cx%3D%2247%22%20cy%3D%2244%22%20r%3D%223.2%22%20fill%3D%22%23fff%22/%3E%3C/g%3E%3Cg%3E%3Cpath%20d%3D%22M72%2030c0-5%203.5-8.5%207.5-8.5S87%2025%2087%2030c0%206-7.5%2012-7.5%2012S72%2036%2072%2030z%22%20fill%3D%22%23ffc928%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222%22/%3E%3Ccircle%20cx%3D%2279.5%22%20cy%3D%2230%22%20r%3D%222.6%22%20fill%3D%22%23fff%22/%3E%3C/g%3E%3Cg%3E%3Cpath%20d%3D%22M70%2066c0-4.5%203-7.5%206.5-7.5S83%2061.5%2083%2066c0%205-6.5%2010.5-6.5%2010.5S70%2071%2070%2066z%22%20fill%3D%22%233ccf91%22%20stroke%3D%22%23fff%22%20stroke-width%3D%222%22/%3E%3Ccircle%20cx%3D%2276.5%22%20cy%3D%2266%22%20r%3D%222.3%22%20fill%3D%22%23fff%22/%3E%3C/g%3E%3C/svg%3E' } };
  function renderHome() {
    renderHero();
    $('hUpd').textContent = t('upd.h'); $('hIcons').textContent = t('upd.games');
    const ups = A_.news ? A_.news() : A_.UPDATES;
    $('updRow').innerHTML = ups.map(u => { const g = A_.GAMES.find(x => x.id === u[1]);
      if (!g) { const k = /^tab:(\w+)$/.exec(u[1]); if (!k || !FEAT[k[1]]) return '';   // a portal feature (tab:<page>): the card opens that tab
        const f = FEAT[k[1]], isNew = A_.daysSince(u[0]) <= 14;
        return `<button class="ut" data-tab="${k[1]}" style="--c:${f.color}"><span class="pan"><span class="new">${isNew ? badgeHtml('new') : ''}</span><span class="dt">${fmtDate(u[0])}</span><img src="${f.art}" alt=""></span>
        <span class="tx"><b>${esc(t('tab.' + k[1]))}</b><p>${esc(utx(u))}</p></span></button>`; }
      return `<button class="ut" data-g="${g.id}" style="--c:${g.color}"><span class="pan"><span class="new">${A_.badges(g).slice(0, 1).map(badgeHtml).join('')}</span><span class="dt">${fmtDate(u[0])}</span>${artImg(g)}</span>
        <span class="tx"><b>${esc(gname(g))}</b><p>${esc(utx(u))}</p></span></button>`; }).join('');
    updNav();
    document.querySelectorAll('#updRow [data-g]').forEach(b => { b.onclick = () => flyOpen(b.dataset.g, b.querySelector('img')); });
    document.querySelectorAll('#updRow [data-tab]').forEach(b => { b.onclick = () => go(b.dataset.tab); });
    renderFilter(); renderGrid();
    renderProfile(); renderToday();
  }
  /* phones: a one-line updates ticker (#updLine, fixed above the tab bar by CSS ≤760px, on every tab but the map / きせかえ):
     the newest few changelog lines run across it as one CSS transform loop (no JS frames; paused with the page by atlas-idle).
     A tap opens a bottom sheet with every line; a red dot marks an update this viewer hasn't opened yet. */
  const UPD_SEEN = 'atlas-upd-seen';
  const updKey = u => u ? u[0] + '|' + u[1] : '';
  const updSeen = () => { try { return localStorage.getItem(UPD_SEEN) || ''; } catch (e) { return ''; } };
  const updWhat = u => { const g = A_.GAMES.find(x => x.id === u[1]); if (g) return { g, name: gname(g), color: g.color, art: artImg(g) };
    const k = /^tab:(\w+)$/.exec(u[1]); if (!k || !FEAT[k[1]]) return null; return { tab: k[1], name: t('tab.' + k[1]), color: FEAT[k[1]].color, art: `<img src="${FEAT[k[1]].art}" alt="">` }; };
  let updSig = '';
  // a news-style headline: the first sentence of the changelog line, cut to ~26 (CJK) / ~52 (others) characters
  const headline = x => { let h = String(x).split(/(?<=[。！？!?])|(?<=\.)\s|[：:—–]\s?/)[0].trim(); const n = /^(ja|zh|ko)$/.test(lang) ? 26 : 52; const c = [...h]; return c.length > n ? c.slice(0, n - 1).join('').replace(/[、,，\s]+$/, '') + '…' : h; };
  function renderUpdLine() {
    const el = $('updLine'); if (!el) return;
    const items = A_.news().map(u => [u, updWhat(u)]).filter(x => x[1]).slice(0, 5);
    if (!items.length) { el.hidden = true; return; }
    const fresh = updKey(A_.UPDATES[0]) !== updSeen(), sig = lang + '|' + items.map(x => updKey(x[0])).join() + '|' + fresh;
    if (sig !== updSig) { updSig = sig; el._w = 0;
      const sep = '<span class="ul-s" aria-hidden="true"></span>';
      const one = items.map(([u, w]) => `<span class="ul-i" style="--c:${w.color}"><span class="ul-a">${w.art}</span><span class="ul-x"><span class="ul-h"><b>${esc(w.name)}</b><span class="ul-d">${esc(fmtDate(u[0]))}</span></span><span class="ul-t">${esc(headline(utx(u)))}</span></span></span>`).join(sep) + sep;   // picture + two lines (name · date / a short headline)
      el.innerHTML = `<span class="ul-k">NEW</span><span class="ul-v"><span class="ul-tr"><span class="ul-g">${one}</span><span class="ul-g" aria-hidden="true">${one}</span></span></span>${fresh ? '<i class="ul-dot" aria-hidden="true"></i>' : ''}<span class="ul-ch" aria-hidden="true">›</span>`;
      el.setAttribute('aria-label', t('upd.more') + ': ' + items.map(([u, w]) => w.name).join(', '));
      el.onclick = openUpdSheet;
      el.style.setProperty('--ud', Math.max(16, el.querySelector('.ul-g').textContent.length * .2).toFixed(1) + 's');   // (a guess until it can be measured)
    }
    // one copy runs past at ~40px/s: measured once the ticker is on screen (it is display:none on PC and on the map / きせかえ)
    if (!el._w) { const w = el.querySelector('.ul-g').offsetWidth; if (w) { el._w = w; el.style.setProperty('--ud', Math.max(12, w / 40).toFixed(1) + 's'); } }
  }
  /* すべての更新: a small newspaper — entries grouped by day under a date masthead (big day number, month, weekday,
     a NEW mark for the last 14 days) with one "what was this day?" line from atlas/updnews.js; the first entry of each
     day is the headline card (bigger picture). Tags come only from clear words in the ja changelog line. */
  const UPD_RULES = /学ぶルール|覚えるルール|ルール(が|は|を|に)(ゲーム紹介|レッスン|チュートリアル)|ルールにゲーム紹介|ルールコース/;
  const updTags = u => { const s = u[2] || '', o = [];
    if (/新登場|新作/.test(s)) o.push('new'); if (/3D/.test(s)) o.push('3d'); if (/オンライン対戦/.test(s)) o.push('online'); if (UPD_RULES.test(s)) o.push('rules'); return o; };
  const NEWS = () => window.AtlasNews || { FACTS: {}, LABEL: {}, TAGS: {} };
  const nl = m => (m && (m[lang] || m.en)) || '';
  const dParts = d => { const dt = new Date(d + 'T00:00:00'); try {
      const day = new Intl.DateTimeFormat(lang, { day: 'numeric' }).formatToParts(dt).find(p => p.type === 'day');
      return { n: day ? day.value : String(dt.getDate()), m: dt.toLocaleDateString(lang, { month: 'long' }), w: dt.toLocaleDateString(lang, { weekday: 'long' }) };
    } catch (e) { return { n: String(dt.getDate()), m: String(dt.getMonth() + 1), w: '' }; } };
  function openUpdSheet() {
    try { localStorage.setItem(UPD_SEEN, updKey(A_.UPDATES[0])); } catch (e) {}
    const dot = document.querySelector('#updLine .ul-dot'); if (dot) dot.remove();
    const N = NEWS(), days = [];
    A_.UPDATES.forEach(u => { const w = updWhat(u); if (!w) return; const last = days[days.length - 1];
      if (last && last.d === u[0]) last.items.push([u, w]); else days.push({ d: u[0], items: [[u, w]] }); });
    // a new title released that day takes the headline card (common rule 2026-11-08: 新作タイトルを一番大きく), the rest keep their order
    const isRel = ([u, w]) => !!(w.g && w.g.released === u[0]);
    days.forEach(d => { const r = d.items.filter(isRel); if (r.length) d.items = [...r, ...d.items.filter(x => !isRel(x))]; });
    const row = ([u, w], i) => { const tg = updTags(u).map(k => `<i class="utg t-${k}">${esc(nl(N.TAGS[k]))}</i>`).join('');
      return `<button type="button" class="usr${i ? '' : ' hl'}" ${w.g ? `data-g="${w.g.id}"` : `data-tab="${w.tab}"`} style="--c:${w.color}"><span class="usi">${w.art}</span><span class="ust"><span class="ush"><b>${esc(w.name)}</b></span>${tg ? `<span class="utgs">${tg}</span>` : ''}<span class="usp">${esc(utx(u))}</span></span></button>`; };
    const body = days.map(({ d, items }) => { const p = dParts(d), f = nl(N.FACTS[d.slice(5)]), fresh = A_.daysSince(d) <= 14;
      return `<section class="udy"><h4 class="udh"><span class="udn">${esc(p.n)}</span><span class="udm"><b>${esc(p.m)}</b><small>${esc(p.w)}</small></span><span class="udr" aria-hidden="true"></span>${fresh ? '<span class="udnew">NEW</span>' : ''}</h4>`
        + (f ? `<p class="udf"><b>${esc(nl(N.LABEL))}</b><span>${esc(f)}</span></p>` : '')
        + `<div class="udg${items.length === 1 ? ' one' : ''}">${items.map(row).join('')}</div></section>`; }).join('');
    openSheet(`<div class="ush"><h3>${esc(t('upd.more'))}</h3><button type="button" class="icbtn usx" aria-label="${esc(t('g.close'))}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="usl">${body}</div>`, 'updsh');
    const sh = $('sheet');
    sh.querySelector('.usx').onclick = closeSheet;
    sh.querySelectorAll('.usr').forEach(b => { b.onclick = () => { closeSheet(); if (b.dataset.g) flyOpen(b.dataset.g, null); else go(b.dataset.tab); }; });
  }

  /* home game list: category chips + search (the chip is remembered per viewer) */
  let gCat = 'all', gQ = '';
  try { gCat = localStorage.getItem('atlas-cat') || 'all'; } catch (e) {}
  // 'classic' is a tag chip (定番) next to the category chips: it filters by g.tags instead of g.cat
  // chips (same as the top page): すべて · ボード (the classic board games, card games excluded) · パズル · カード (tag) · then the board-game families
  const CHIPS = ['all', 'board', 'puzzle', 'card', 'chess', 'line', 'race', 'hist'];
  const inCat = (g, k) => k === 'all' || (k === 'board' ? g.tags.includes('classic') && !g.tags.includes('card') : k === 'card' ? g.tags.includes('card') : g.cat === k || (g.also || []).includes(k));
  if (gCat === 'classic') gCat = 'board';
  if (!CHIPS.includes(gCat)) gCat = 'all';
  // lower-case, full-width → half-width, katakana → hiragana: 「りばーし」 finds リバーシ
  const norm = s => String(s).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・·\-_.]/g, '');
  const hay = g => norm([g.id, ...Object.values(g.name), ...g.tags, ...g.tags.map(k => t('tag.' + k)), ...g.tags.map(k => I.en['tag.' + k] || ''), t('cat.' + g.cat)].join('|'));
  function visibleGames() {
    const q = norm(gQ.trim());
    return A_.byUpdate().filter(g => inCat(g, gCat) && (!q || hay(g).includes(q)));
  }
  const SRCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  // the same chips + search on the home grid and on the games tab (they share one filter state)
  function renderFilter(ids = { chips: 'catChips', q: 'gSearch', ic: 'gSearchIc' }, onChange = renderGrid) {
    const cats = CHIPS, C = $(ids.chips);
    C.innerHTML = cats.map(k => { const n = A_.GAMES.filter(g => inCat(g, k)).length;
      return `<button type="button" class="chip cat" data-k="${k}" aria-pressed="${gCat === k}">${esc(t('cat.' + k))} <em>${n}</em></button>`; }).join('');
    C.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { gCat = b.dataset.k; try { localStorage.setItem('atlas-cat', gCat); } catch (e) {}
      C.querySelectorAll('[data-k]').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === gCat)); SFX.tok(); onChange(); });
    const s = $(ids.q); s.placeholder = t('search.ph'); s.setAttribute('aria-label', t('search.ph')); s.value = gQ;
    s.oninput = () => { gQ = s.value; onChange(); };
    $(ids.ic).innerHTML = SRCH;
  }
  // the random tile: an isometric die with "?" faces on a thick base, drawn like the 3D game icons
  // the ランダム tile: a 3D icon in two layers like the others (atlas/icons3d.js ICONS.random, ?part=base / top): the die bobs on its own
  const RND_SVG = `<span class="dieic" aria-hidden="true"><img class="rb" src="../images/atlas/random-base.webp?v=1" alt="" decoding="async"><img class="cube" src="../images/atlas/random-die.webp?v=1" alt="" decoding="async"></span>`;
  function renderGrid() {
    const list = visibleGames();
    const rnd = list.length ? `<button type="button" class="ic rnd" id="rndTile" style="--c:#8d6bff" aria-label="${esc(t('rnd.n'))}"><span class="art">${RND_SVG}<img class="rimg" alt="" decoding="async" hidden></span>
      <span class="lab"><span class="n">${esc(t('rnd.n'))}</span><span class="pr"><i style="width:100%"></i></span></span></button>` : '';
    $('iconGrid').innerHTML = rnd + list.map(g => { const b = A_.badges(g)[0];
      return `<button class="ic" data-g="${g.id}" style="--c:${g.color}"><span class="art"><span class="no">${gno(g)}</span>${artImg(g)}</span>${b ? `<span class="bdg">${badgeHtml(b)}</span>` : ''}
        <span class="lab"><span class="n">${esc(gname(g))}</span><span class="pr"><i style="width:${P[g.id].pct}%"></i></span></span></button>`; }).join('');
    $('gNone').hidden = !!list.length; $('gNone').textContent = t('search.none');
    $('iconGrid').querySelectorAll('[data-g]').forEach(b => { b.onclick = () => flyOpen(b.dataset.g, b.querySelector('img')); });
    if ($('rndTile')) $('rndTile').onclick = () => rollRandom(list);
    if (window.AtlasGameList && AtlasGameList.fitLabels) AtlasGameList.fitLabels($('iconGrid').querySelectorAll('.ic span.n'));   // long names shrink rather than end in "…"
  }
  // random: the die hops, a quick roulette of the visible games' icons, then the picked one flies to the board
  let rolling = false;
  function rollRandom(list) {
    if (rolling || flying || !list.length) return;
    rolling = true;
    const tile = $('rndTile'), img = tile.querySelector('.rimg'), pick = list[Math.random() * list.length | 0];
    const pi = list.indexOf(pick), seq = [];
    for (let i = 0; i < 9; i++) seq.push(list[(pi + 1 + i) % list.length]);   // cycles round and stops on the pick
    seq.push(pick);
    tile.classList.add('roll'); SFX.boing();
    let k = 0, delay = 300;
    const stepR = () => {
      const g = seq[k];
      img.src = artSrc(g); img.hidden = false; tile.style.setProperty('--c', g.color); tile.classList.add('show');
      img.animate && img.animate([{ transform: 'translateY(-10px) scale(.86)' }, { transform: 'none' }], { duration: 120, easing: 'ease-out' });
      SFX.tok();
      if (++k < seq.length) { delay = 45 + k * k * 2.6; setTimeout(stepR, delay); }
      else { tile.querySelector('.n').textContent = gname(pick); setTimeout(() => { rolling = false; flyOpen(pick.id, img); }, 260); }
    };
    setTimeout(stepR, 280);
  }
  // today's game: one per day (the same for everybody), with a short history; tap → its chabudai view
  function todayGame() { const d = Math.floor(Date.parse(A_.ymd(Date.now())) / 864e5), n = A_.GAMES.length; return A_.GAMES[((d * 3) % n + n) % n]; }
  function renderToday() {
    const g = todayGame(), el = $('today');
    const hk = 'hist.' + g.id, hs = t(hk) !== hk ? t(hk) : ((window.ATLAS_I18N && ATLAS_I18N.en[hk]) || '');   // a short history or trivia — never the rules (falls back to English, else empty)
    el.style.setProperty('--c', g.color);
    el.innerHTML = `<span class="pan">${artImg(g).replace(' loading="lazy"', '')}</span>
      <span class="tx"><span class="kk"><span class="lbl">☀ ${esc(t('today.h'))}</span><span class="dt">${esc(new Date().toLocaleDateString(lang, { month: 'short', day: 'numeric', weekday: 'short' }))}</span></span>
        <b>${esc(gname(g))}</b><span class="hs">${esc(hs)}</span>
        <span class="ft">${window.Historia && (!Historia.has || Historia.has(g.id)) ? `<span class="hsb" role="button" tabindex="0" data-hist="${g.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14M6 20V10M10 20V10M14 20V10M18 20V10M4 10h16M12 3l8 4.5H4z"/></svg><span class="hsl">${esc(t('gl.histSee'))}</span></span>` : ''}<span class="btn sm" role="button" tabindex="0" data-go>${esc(placeT('go'))} ▶</span></span></span>`;
    // the history fills the room above the two buttons; it is cut (…) only where the card truly has no more height
    // the history scrolls inside the card (no cut); only the picture and the ▶ button open the table
    el.setAttribute('aria-label', t('today.h') + ': ' + gname(g));
    const goT = e => { if (e) { e.preventDefault(); e.stopPropagation(); } flyOpen(g.id, el.querySelector('.pan img')); };
    el.onclick = e => { if (e.target.closest('.pan, [data-go]')) goT(e); };
    { const b = el.querySelector('[data-go]'); b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') goT(e); }; }
    const hb = el.querySelector('[data-hist]');   // ヒストリアを見る: the history book of today's game (not the table)
    if (hb) { const go = e => { e.preventDefault(); e.stopPropagation(); Historia.open(g.id); };
      hb.onclick = go; hb.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') go(e); };
      // when 「ヒストリアを見る」 doesn't fit its button (narrow phones, long languages) it says just 「ヒストリア」
      const lb = hb.querySelector('.hsl'), fitH = () => { if (!hb.isConnected) return; lb.textContent = t('gl.histSee'); if (hb.scrollWidth > hb.clientWidth + 1) lb.textContent = t('gl.historia'); };
      requestAnimationFrame(fitH); if (document.fonts) document.fonts.ready.then(fitH);
      if (!renderToday.rs) { renderToday.rs = 1; let q = 0; addEventListener('resize', () => { clearTimeout(q); q = setTimeout(() => { const f = document.querySelector('#today [data-hist]'); if (f && f.__fit) f.__fit(); }, 150); }); }
      hb.__fit = fitH; }
  }

  /* ---------- 3D board viewer ---------- */
  let glOK = false, bvGame = null, session = null;
  // card games are 2D only, like the puzzle games (no 3D table): the board card says so and Play opens the game
  const CARD2D = { poker: true, blackjack: true, baccarat: true, solitaire: true };
  const pref = (() => { try { return JSON.parse(localStorage.getItem('atlas-play') || '{}'); } catch (e) { return {}; } })();
  // the textures of the room and of each board are drawn in workers (texgen.js): the work is tagged per board,
  // and a board is only shown once its pictures are done (texReady)
  const TG = window.AtlasTexGen;
  const tagged = (name, fn) => TG ? TG.group(name, fn) : fn();
  const texBusy = id => !!TG && TG.busy([id, 'room']);
  const texReady = id => { if (!TG) return Promise.resolve(); TG.prioritize([id, 'room']); return TG.idle([id, 'room']); };
  function initGL() {
    if (glOK || !window.THREE) return glOK;
    try { tagged('room', () => Table3D.mount($('gl'))); glOK = true; } catch (e) { glOK = false; }
    return glOK;
  }
  /* tap an icon → it flies to the centre spinning, then turns into the 3D board (≈0.8 s) */
  let flying = false;
  function warm(id) { if (window.AtlasLazy && !AtlasLazy.loaded(id)) return; if (initGL()) tagged(id, () => Table3D.prepare(id)); }   // (a game whose files are not loaded yet: not built from the bare fallback board)   // (the icon intro isn't used by the portal: no icon model is built / compiled)
  function flyOpen(id, img) {
    if (flying) return;
    if (window.AtlasLazy) AtlasLazy.need(id);   // (its files load while the icon flies)
    if (!img || !img.animate) return openBoard(id);   // (animations run even with the OS 'reduce motion' setting: they're part of the design)
    flying = true; initGL();
    const r = img.getBoundingClientRect(), W = innerWidth, H = innerHeight, wide = W > 900 && W / H > 1.25;
    const cx = W / 2, cy = H / 2;   // the exact centre of the screen
    // wrapper does the travel (translate/scale), the image inside does the 3D spin → both run on the compositor
    const wrap = document.createElement('div'), fly = img.cloneNode();
    fly.removeAttribute('loading'); fly.removeAttribute('class');
    Object.assign(wrap.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', zIndex: 90, pointerEvents: 'none', perspective: '700px' });
    Object.assign(fly.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 14px 12px rgba(0,0,0,.25))', transformOrigin: '50% 55%', backfaceVisibility: 'visible' });
    wrap.appendChild(fly); document.body.appendChild(wrap); img.style.visibility = 'hidden';
    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2), sc = Math.min(W * .55, 280) / Math.max(r.width, 1);
    const T1 = 560;
    // sounds follow the phases below: squash → leap (boing), two spins (whoosh ×2), landing (tok)
    SFX.boing(40); SFX.whoosh(110, .19); SFX.whoosh(290, .19); SFX.tok(515);
    wrap.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(0,8px) scale(1.06)', offset: .14 },
      { transform: `translate(${dx * .45}px, ${dy * .45 - Math.min(140, H * .16)}px) scale(${1 + (sc - 1) * .55})`, offset: .58 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sc * 1.06})`, offset: .86 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sc})` },
    ], { duration: T1, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'forwards' });
    fly.animate([   // squash → stretch while leaping → two full turns (coin flip) → landing squash
      { transform: 'scale(1,1) rotateY(0)' },
      { transform: 'scale(1.18,.78) rotateY(0)', offset: .14 },
      { transform: 'scale(.86,1.2) rotateY(300deg)', offset: .5 },
      { transform: 'scale(1,1) rotateY(640deg)', offset: .84 },
      { transform: 'scale(1.12,.88) rotateY(720deg)', offset: .93 },
      { transform: 'scale(1,1) rotateY(720deg)' },
    ], { duration: T1, easing: 'linear', fill: 'forwards' });
    let done = false;
    const finish = () => {   // pop: the icon bursts and the board lands
      if (done) return; done = true;
      // BANG: the icon swells and pops inside a puff of smoke; the board appears the moment it vanishes
      fly.getAnimations().forEach(a => a.cancel());
      wrap.animate([{ opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${sc})` }, { opacity: 1, transform: `translate(${dx}px, ${dy + 6}px) scale(${sc * 1.12},${sc * .86})`, offset: .35 }, { opacity: 1, transform: `translate(${dx}px, ${dy - 6}px) scale(${sc * 1.3})`, offset: .7 }, { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${sc * .2})` }], { duration: 230, easing: 'ease-in', fill: 'forwards' })
        .onfinish = () => { wrap.remove(); img.style.visibility = ''; flying = false; };
      magic(cx, cy, 0, Math.min(W * .55, 280), -110);
      SFX.pop(140); SFX.shimmer(190); SFX.chime(420);   // swell & pop → smoke / sparkle burst → the board appears (reveal at 400 ms)
      setTimeout(() => window.Table3D && Table3D.reveal(), 400);   // after the icon has gone and the smoke is at its fullest
    };
    setTimeout(() => {
      // keep it alive (wobble) while the board is being built, so a slow phone never shows a frozen icon
      fly.animate([{ transform: 'rotateY(720deg) translateY(0)' }, { transform: 'rotateY(740deg) translateY(-6px)' }, { transform: 'rotateY(700deg) translateY(0)' }], { duration: 360, iterations: Infinity, easing: 'ease-in-out' });
      const go = () => requestAnimationFrame(() => setTimeout(() => {
        openBoard(id, true, true);
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 900);
      }, 0));
      (window.AtlasLazy ? AtlasLazy.need(id) : Promise.resolve()).then(() => {   // (its files first: atlas/lazy.js)
        try { warm(id); } catch (e) {}
        if (texBusy(id)) texReady(id).then(go); else go();   // (the icon keeps wobbling meanwhile)
      });
    }, T1);
  }
  // magic: sparkles trail the rising icon, then rain down and twinkle over the board as it appears
  function magic(cx, cy, rise, size, shift = 0) {
    const box = document.createElement('div'); box.className = 'magic'; document.body.appendChild(box);
    const W = innerWidth, H = innerHeight, big = Math.hypot(W, H) / 2, sm = Math.min(W, H);
    const cols = ['#ffd84a', '#fff6b0', '#ff8fd0', '#7fdcff', '#b99bff', '#ffffff', '#7af0b0', '#ff9b5a'];
    const add = (x, y, delay, kf, dur, sz, cls) => {
      const e = document.createElement('i'); if (cls) e.className = cls; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.width = e.style.height = sz + 'px'; e.style.color = cols[Math.random() * cols.length | 0];
      box.appendChild(e); e.animate(kf, { duration: dur, delay: Math.max(0, delay + shift), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
    };
    const gr = $('gl').getBoundingClientRect(), bx = gr.left + gr.width / 2, by = gr.top + gr.height / 2;   // where the board appears
    // 1) trail behind the icon as it zips up
    for (let i = 0; i < (rise ? 30 : 0); i++) {
      const t = i / 30, x = cx + (Math.random() - .5) * size * .8, y = cy - rise * t + (Math.random() - .5) * 50;
      add(x, y, t * 220, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2) rotate(0)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.2) rotate(90deg)', offset: .3 }, { opacity: 0, transform: `translate(-50%,-50%) translateY(${30 + Math.random() * 50}px) scale(.3) rotate(200deg)` }], 560, 16 + Math.random() * 22);
    }
    // 2) full-screen flash + rotating light rays
    const flash = document.createElement('u'); flash.className = 'flash'; box.appendChild(flash);
    flash.animate([{ opacity: 0 }, { opacity: .85, offset: .25 }, { opacity: 0 }], { duration: 420, delay: shift + 160, easing: 'ease-out', fill: 'both' });
    const rays = document.createElement('u'); rays.className = 'rays'; rays.style.left = bx + 'px'; rays.style.top = by + 'px'; rays.style.width = rays.style.height = big * 2.4 + 'px'; box.appendChild(rays);
    rays.animate([{ opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg) scale(.4)' }, { opacity: .75, transform: 'translate(-50%,-50%) rotate(40deg) scale(1)', offset: .35 }, { opacity: 0, transform: 'translate(-50%,-50%) rotate(90deg) scale(1.15)' }], { duration: 720, delay: shift + 160, easing: 'ease-out', fill: 'both' });
    // 3) "dorone": a big puff of cartoon smoke
    const smoke = document.createElement('div'); smoke.className = 'smoke'; smoke.style.left = bx + 'px'; smoke.style.top = by + 'px'; box.appendChild(smoke);
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + Math.random() * .3, d = sm * (.32 + Math.random() * .3), pz = sm * (.22 + Math.random() * .2), p = document.createElement('span');
      p.style.width = p.style.height = pz + 'px'; smoke.appendChild(p);
      p.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: `translate(calc(-50% + ${Math.cos(a) * d * .5}px), calc(-50% + ${Math.sin(a) * d * .42}px)) scale(1)`, offset: .3 }, { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * d * 1.25}px), calc(-50% + ${Math.sin(a) * d * .9 - 40}px)) scale(1.45)` }], { duration: 700, delay: shift + 150 + Math.random() * 50, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    }
    const core = document.createElement('span'); core.className = 'core'; core.style.width = core.style.height = sm * .62 + 'px'; smoke.appendChild(core);
    core.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.05)', offset: .25 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.6)' }], { duration: 560, delay: shift + 150, easing: 'ease-out', fill: 'both' });
    // 4) stars shooting out to the edges of the screen
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * Math.PI * 2 + Math.random() * .2, d = big * (.6 + Math.random() * .55);
      add(bx, by, 170 + Math.random() * 80, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: `translate(calc(-50% + ${Math.cos(a) * d * .55}px), calc(-50% + ${Math.sin(a) * d * .55}px)) scale(1.4) rotate(140deg)`, offset: .45 }, { opacity: 0, transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40}px)) scale(.5) rotate(300deg)` }], 720, 24 + Math.random() * 30);
    }
    // 5) glitter all over the screen, twinkling out
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      add(x, y, 240 + Math.random() * 380, [{ opacity: 0, transform: 'translate(-50%,-50%) translateY(-40px) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) translateY(0) scale(1.2) rotate(45deg)', offset: .45 }, { opacity: 0, transform: 'translate(-50%,-50%) translateY(20px) scale(.2) rotate(150deg)' }], 520, 8 + Math.random() * 18);
    }
    const ring = document.createElement('b'); ring.style.left = bx + 'px'; ring.style.top = by + 'px'; ring.style.width = ring.style.height = sm * .9 + 'px'; box.appendChild(ring);
    ring.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .35 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.2)' }], { duration: 600, delay: shift + 140, easing: 'ease-out', fill: 'both' });
    setTimeout(() => box.remove(), 1300);
  }
  let show3dTok = 0, pend3d = null;   // a board waiting for its textures (see openBoard)
  let bvDrawer = 0;   // phones: the board card's drawer state, kept while moving between games on the table
  // a game's 3D board / table play / rules tour load when it is opened (atlas/lazy.js): the board view waits for them (2026-11-10)
  let openTok = 0;
  function openBoard(id, push = true, flown = false) {
    const L = window.AtlasLazy;
    if (L && !L.loaded(id)) { const tok = ++openTok; document.body.classList.add('lz-wait'); return L.need(id).then(() => { document.body.classList.remove('lz-wait'); if (tok === openTok) openBoard0(id, push, flown); }); }
    ++openTok; openBoard0(id, push, flown); return Promise.resolve();
  }
  function openBoard0(id, push = true, flown = false) {
    const g = A_.GAMES.find(x => x.id === id); if (!g) return;
    if (!$('bv').classList.contains('on')) bvDrawer = 0;   // freshly opened: the default (settings) card
    const back = $('bv').classList.contains('playing');   // coming back from a game / the rules on the table
    bvGame = g; stopSession(); renderPlace();   // (the panel's 盤 row follows the game on the table)
    setTimeout(landNudge, 900);
    $('bv').classList.add('on'); $('bv').classList.remove('playing'); $('endc').classList.remove('on');
    // keep the board framed above the card whatever changes its size later (fonts, the phone drawer, coming back from a game);
    // scheduled first so it also runs if anything below fails
    [60, 600, 1000].forEach(ms => setTimeout(fitStage, ms));   // (the camera glides back by itself: no snapping)
    if (window.ResizeObserver && !window.__bvRO) { window.__bvRO = new ResizeObserver(() => fitStage()); window.__bvRO.observe($('bvi')); }
    // table play: やめる and the action bar's buttons take the HUD pill's height (--hudh), so the three read as one set (2026-11-09)
    if (window.ResizeObserver && !window.__hudRO) { window.__hudRO = new ResizeObserver(() => { const h = $('hud').offsetHeight; if (h >= 36) $('bv').style.setProperty('--hudh', h + 'px'); }); window.__hudRO.observe($('hud')); }
    document.body.style.overflow = 'hidden';
    if (push) history.replaceState(null, '', '#' + page + '/' + id);
    if (initGL()) {
      // back from a game on the table: the board settles in softly and the camera glides back (ease-in-out) to the showcase view
      const show3d = () => {
        if (back) { Table3D.show(id, null, { soft: true }); Table3D.play(false, { glide: 400 }); }
        else { Table3D.show(id, null, flown ? { magic: true, hold: true } : {}); Table3D.play(false); }
      };
      if (TG && !back) try { warm(id); } catch (e) {}   // (built now, so its textures are under way)
      if (!back && texBusy(id)) {   // its textures are still being drawn (opened right after the page loaded): show it when they are done
        const tok = ++show3dTok, gl = $('gl'); gl.style.visibility = 'hidden';
        pend3d = texReady(id).then(() => { if (tok !== show3dTok) return; pend3d = null; gl.style.visibility = ''; if (bvGame === g && $('bv').classList.contains('on')) show3d(); });
      } else { ++show3dTok; pend3d = null; $('gl').style.visibility = ''; show3d(); }
    }
    else $('gl').innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center"><img src="${artSrc(g)}" alt="" style="width:min(70vw,420px)"></div>`;
    const ad = glOK && window.Atlas3D && Atlas3D[id], r = P[id];
    const rows = [];
    if (g.total.pz) rows.push([t('pg.pz'), r.pz || 0, g.total.pz]);
    if (g.total.ls) rows.push([t('pg.ls'), r.ls || 0, g.total.ls]);
    const lv = pref[id + ':lv'] || 1, side = pref[id + ':side'] || 1;
    const bsz = ad && ad.sizes ? (ad.sizes.includes(+pref[id + ':size']) ? +pref[id + ':size'] : ad.sizes.includes(ad.size0) ? ad.size0 : ad.sizes[0]) : 0;   // board size (go, hex, tafl); adapter.size0 = the default
    const mode = ad && ad.modes && ad.modes.includes(pref[id + ':mode']) ? pref[id + ':mode'] : 'ai';
    // board size (go): on the same row as the time control when there is one
    const sizeHtml = ad && ad.sizes ? `<label>${esc(ad.sizeLabel ? ad.sizeLabel(lang) : '')}<select id="bvSize">${ad.sizes.map(z => `<option value="${z}" ${z === bsz ? 'selected' : ''}>${ad.sizeName ? esc(ad.sizeName(z, lang)) : z + '×' + z}</option>`).join('')}</select></label>` : '';
    headIcons(false);   // (ヒストリア / 戦績 back out of the old card before it is rebuilt)
    $('bvi').innerHTML = `<div class="cols"><div class="L"><div class="row">${g3(g)}<div style="min-width:0;flex:1"><h3>${esc(gname(g))}</h3><div class="bd">${A_.badges(g).map(badgeHtml).join('')}</div></div>${glOK && window.AtlasRules && AtlasRules[id] ? `<button type="button" class="rulesb" id="bvRules"><span>📖</span><b>${t('bv.rules')}</b></button>` : ''}${ring(r.pct, g.color)}</div>
      <div class="tags">${g.tags.filter(k => k !== 'mobile').map(tagHtml).join('')}</div>
      <p class="bvab">${esc(t('about.' + id))}</p>
      ${rows.length ? `<div class="pgl">${rows.map(([l, a, b]) => `<span>${l}</span><span class="bar" style="--c:${g.color}"><i style="width:${Math.min(100, a / b * 100)}%"></i></span><b>${Math.min(a, b)}/${b}</b>`).join('')}</div>` : ''}
      </div><div class="R">${ad && ad.modes ? `<div class="mtab3" id="bvMode">${ad.modes.map(m => `<button type="button" data-m="${m}" class="${m === mode ? 'on' : ''}">${t('bv.m.' + m)}</button>`).join('')}</div>` : ''}${ad ? `<div class="mbody" id="bvMBody">${ad.modes ? `<div class="mnote" id="bvMNote"></div>` : ''}<div class="opts" id="bvOpts"><label>${t('bv.level')}<select id="bvLv">${Array.from({ length: ad.levels }, (_, i) => `<option value="${i + 1}" ${i + 1 === lv ? 'selected' : ''}>Lv.${i + 1}${ad.levelInfo && lvNm(ad.levelInfo(i + 1, lang), i + 1, lang, ad.levels) ? ' ' + esc(lvNm(ad.levelInfo(i + 1, lang), i + 1, lang, ad.levels)) : ''}</option>`).join('')}</select></label>
        ${ad.sides ? `<label>${t('bv.side')}<select id="bvSide"><option value="1" ${side === 1 ? 'selected' : ''}>${t('bv.first')}</option><option value="2" ${side === 2 ? 'selected' : ''}>${t('bv.second')}</option></select></label>` : ''}
        ${ad.sizes && !(ad.table && TCS[ad.clock]) && !ad.house ? sizeHtml : ''}${ad.house ? `<button type="button" class="hrb" id="bvHouse"><span>${esc(ad.house.label(lang))}</span><b></b><i aria-hidden="true">⚙</i></button>` : ''}</div>
        ${ad.table && TCS[ad.clock] ? `<div class="opts tcrow" id="bvTcRow"><label>${t('tc.h')}<button type="button" class="lvpick" id="bvTc" data-v="${esc(tcOf(ad, pref[id + ':tc']).id)}"></button></label>${ad.sizes ? sizeHtml : ''}</div>` : ''}</div>${ad.house && ad.sizes ? `<div class="opts szrow" id="bvSzRow">${sizeHtml}</div>` : ''}` : (g.id === 'sudoku' || g.id === 'speedsudoku' || g.id === 'samegame' || g.id === 'jailbreak' || g.id === 'amazons' ? `<div class="soon ext"><b>${t('bv.ext')}</b><span>${t('bv.extSub', { name: esc(gname(g)) })}</span></div>` : CARD2D[g.id] ? `<div class="soon ext"><b>${t('bv.card2d')}</b><span>${t('bv.card2dSub', { name: esc(gname(g)) })}</span></div>` : `<div class="soon">${t('bv.soon')}</div>`)}
      <div class="act${ad && ad.table && FULL_SKIN[g.id] ? ' act3' : ''}">${!ad ? `<a class="btn big" href="../${g.href}">${t('play')} ▶</a>`
        : ad.table && FULL_SKIN[g.id] ? `<button class="btn big pk" id="bvFull"><b>${t('bv.full')} ▶</b><small>${t('bv.fullSub')}</small></button><button class="btn big2 pk" id="bvTable"><b>${esc(placeT('play'))}</b><small>${t('bv.tableSub')}</small></button><a class="btn ghost big2 pk" href="../${g.href}"><b>${t('bv.classic')}</b><small>${t('bv.classicSub')}</small></a>`
        : `<button class="btn big" id="bvStart">${t('bv.start')} ▶</button>${g.only3d ? '' : `<a class="btn ghost big2" href="../${g.href}">${t('bv.classic')}</a>`}`}</div></div></div>`;   // (only3d: a game made for the 3D table alone — carrom — has no 2D page)
    if (window.AtlasGameList && AtlasGameList.fitTitle) AtlasGameList.fitTitle($('bvi').querySelector('.row h3'));   // the whole name, never "…"
    // three ways to play: on the chabudai (the portal's own 3D play), the full game in the 3D skin, or the 2D game
    if ($('bvStart')) $('bvStart').onclick = () => startPlay();
    if ($('bvTable')) $('bvTable').onclick = () => startPlay('table');
    if ($('bvFull')) $('bvFull').onclick = () => startPlay('full');
    if ($('bvMode')) {   // AI / rated / two players: only the AI game has a level and a side to pick
      // the card keeps the AI-game height: the note of the other modes fills the space the level / side rows take
      // one fixed height for the settings area in every mode (the tallest mode's): the note of a mode without a level fills the space
      const body = $('bvMBody');
      const layout = m => {
        $('bvOpts').hidden = m !== 'ai'; $('bvMNote').hidden = m === 'ai';
        if ($('bvTcRow')) $('bvTcRow').hidden = !(ad.tableModes || ['ai']).includes(m);   // the time control is for table play only
        $('bvMNote').textContent = m === 'ai' ? '' : t('bv.m.' + m + 'Note');
      };
      let bodyH = 0;
      const measure = () => { body.style.height = 'auto'; bodyH = 0; ad.modes.forEach(m => { layout(m); $('bvMNote').style.flex = 'none'; bodyH = Math.max(bodyH, body.offsetHeight); }); $('bvMNote').style.flex = ''; body.style.height = bodyH + 'px'; };
      const setMode = m => { $('bvMode').dataset.v = m; $('bvMode').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
        if (!bodyH) measure();
        layout(m);
        if ($('bvTable')) $('bvTable').disabled = !(ad.tableModes || ['ai']).includes(m);   // rated / online games need the full game
        fitStage(); };
      if (window.__bvModeRz) removeEventListener('resize', window.__bvModeRz);
      window.__bvModeRz = () => { if (!$('bvOpts') || !$('bvMode')) return; bodyH = 0; setMode($('bvMode').dataset.v); }; addEventListener('resize', window.__bvModeRz);
      $('bvMode').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
      setMode(mode);
      // measure again once the custom pickers below are in place and the web fonts have loaded
      setTimeout(() => window.__bvModeRz && window.__bvModeRz(), 0); if (document.fonts) document.fonts.ready.then(() => window.__bvModeRz && window.__bvModeRz());
    }
    if ($('bvRules')) $('bvRules').onclick = startRules;
    $('bvRec').setAttribute('aria-label', t('rec.btn')); $('bvRec').title = t('rec.btn'); $('bvRec').onclick = () => { try { SFX.tap && SFX.tap(); } catch (e) {} openRec(g); };   // (the cup: phones right of the ヒストリア pill, PC beside the place chip)
    placeRec();
    // phones: a grab handle on the card — swipe down (or tap) folds away the tags and progress, leaving the game settings; swipe up opens it again
    if (matchMedia('(max-width: 819px)').matches) {
      // phones: tags + progress live in a drawer above the settings; it follows the finger (swipe up opens, down closes)
      const card = $('bvi'), L = card.querySelector('.L'), grab = document.createElement('div'); grab.className = 'grab'; grab.innerHTML = '<i></i>'; card.prepend(grab);
      const more = document.createElement('div'); more.className = 'more';
      [...L.querySelectorAll(':scope > .tags, :scope > .bvab, :scope > .pgl')].forEach(n => more.appendChild(n)); L.appendChild(more);
      { const pg = more.querySelector('.pgl'), rg = L.querySelector('.row .ring');   // the % ring sits right of the progress bars
        if (pg && rg) { const pr = document.createElement('div'); pr.className = 'pgrow'; pg.before(pr); pr.append(pg, rg); }
        else if (rg) { const pr = document.createElement('div'); pr.className = 'pgrow solo'; more.appendChild(pr); pr.append(rg); } }   // (no progress bars — e.g. Ur: the ring alone, still only in the open drawer)
      // the level hint folds away with them (wrapped so its height can animate)
      const lvi = $('bvLvInfo'), D = [more];
      if (lvi) { const w = document.createElement('div'); w.className = 'more lvw'; lvi.before(w); w.appendChild(lvi); D.push(w); }
      // three states: 1 = open (tags + progress shown), 0 = settings (default), -1 = mini (only the name row: the board can be seen)
      const RC = card.querySelector('.R');
      let st = 0, fold = true;
      const fullOf = el => { const h = el.style.height; el.style.height = 'auto'; const v = el.scrollHeight; el.style.height = h; return v; };
      let Hs = [], Hr = 1;
      const apply = k => {   // k in [-1, 1] (a little beyond while rubber-banding)
        const ku = Math.max(0, k), kd = Math.max(0, Math.min(1, 1 + Math.min(0, k)));
        D.forEach((el, i) => { el.style.height = Math.max(0, Hs[i] * ku) + 'px'; el.style.opacity = Math.max(0, Math.min(1, ku * 1.4)); });
        if (RC) { RC.style.height = Math.max(0, Hr * kd) + 'px'; RC.style.opacity = Math.max(0, Math.min(1, kd * 1.6 - .4)); RC.style.overflow = 'hidden'; }
      };
      const measure = () => { Hs = D.map(fullOf); Hr = RC ? fullOf(RC) : 1; };
      const to = (s, anim = true) => {
        st = s; bvDrawer = s; fold = s < 1; measure();
        const els = [...D, RC].filter(Boolean);
        els.forEach(el => { el.style.transition = anim ? 'height .32s cubic-bezier(.3,1.15,.5,1), opacity .25s' : 'none'; });
        apply(s);
        card.classList.toggle('fold', s < 1); card.classList.toggle('mini', s < 0);
        setTimeout(() => {
          els.forEach(el => { el.style.transition = 'none'; });
          if (s === 1) D.forEach(el => { el.style.height = 'auto'; });
          if (RC && s >= 0) { RC.style.height = 'auto'; RC.style.overflow = ''; }
          fitStage();
        }, anim ? 340 : 0);
      };
      to(bvDrawer, false);   // moving to the next / previous game keeps the card as it was (lowered stays lowered)
      let y0 = null, s0 = 0, p0 = 0, last = 0, lt = 0, vy = 0, kNow = 0, Hup = 1;
      card.addEventListener('touchstart', e => { const r = card.getBoundingClientRect(), y = e.touches[0].clientY; if (y - r.top > 110) { y0 = null; return; }
        y0 = y; measure(); Hup = Hs.reduce((a, b) => a + b, 0) || 1; s0 = st; p0 = st === 1 ? Hup : st === 0 ? 0 : -Hr; kNow = st; last = y; lt = performance.now(); vy = 0;
        [...D, RC].filter(Boolean).forEach(el => { el.style.transition = 'none'; }); apply(st); }, { passive: true });
      card.addEventListener('touchmove', e => { if (y0 === null) return; const y = e.touches[0].clientY, now = performance.now();
        vy = (y - last) / Math.max(1, now - lt); last = y; lt = now;
        const p = p0 + (y0 - y); let k = p >= 0 ? p / Hup : p / Hr;
        if (k > 1) k = 1 + (k - 1) * .25; if (k < -1) k = -1 + (k + 1) * .25;   // rubber band past the ends
        kNow = k; apply(k); if (Math.abs(y - y0) > 6) e.preventDefault(); }, { passive: false });
      card.addEventListener('touchend', () => { if (y0 === null) return; y0 = null;
        const t = vy < -.3 ? Math.min(1, s0 + 1) : vy > .3 ? Math.max(-1, s0 - 1) : Math.max(-1, Math.min(1, Math.round(kNow)));
        to(t); }, { passive: true });
      grab.onclick = () => to(st === 0 ? 1 : 0);   // tap the handle: settings ↔ open, and from mini back to settings
    }
    // phones: the title needs the width — the rules button joins the end of the feature tags as a small pill
    if ($('bvRules') && matchMedia('(max-width: 819px)').matches) { const rw = $('bvi').querySelector('.row'); if (rw) { $('bvRules').classList.add('ph'); rw.appendChild($('bvRules')); } }   // phones
    // the board card's choices as our own UI (no system pickers): the side as a two-button toggle,
    // the level as a button that opens a list sheet with each level's name, meter and who it suits
    ['bvSide', 'bvSize'].forEach(sid => { if (!$(sid)) return;
      // many choices (ludo: rule × players): a picker button + a list sheet instead of a wrapping toggle — phones (2026-11-09),
      // and on every screen for a game with house rules (its own row under the level: the same pulldown as the level)
      if (sid === 'bvSize' && $(sid).options.length > 3 && (ad.house || matchMedia('(max-width: 819px)').matches)) {
        const sel = $(sid), bt = document.createElement('button'); bt.type = 'button'; bt.className = 'lvpick'; sel.hidden = true; sel.after(bt);
        const paint = () => { const o = sel.options[sel.selectedIndex]; bt.innerHTML = `<span>${esc(o ? o.textContent : '')}</span><i>▾</i>`; };
        sel.addEventListener('change', paint); paint();
        bt.onclick = () => {
          const lab = sel.closest('label'), hd = lab ? [...lab.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() : '';
          const sh = document.createElement('div'); sh.className = 'lvsheet tcsheet'; sh.innerHTML = `<div class="lvs-in" role="listbox"><div class="lvs-h">${esc(hd)}<button type="button" class="lvs-x" aria-label="${esc(t('bv.close'))}">✕</button></div><div class="lvs-l">` +
            [...sel.options].map(o => `<button type="button" role="option" data-v="${esc(o.value)}" class="${o.value === sel.value ? 'on' : ''}"><span class="nm">${esc(o.textContent)}</span></button>`).join('') + `</div></div>`;
          document.body.appendChild(sh); requestAnimationFrame(() => sh.classList.add('on'));
          const close = () => { if (sh.classList.contains('out')) return; sh.classList.add('out'); sh.classList.remove('on'); setTimeout(() => sh.remove(), 240); };
          sh.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { sel.value = b.dataset.v; sel.dispatchEvent(new Event('change')); close(); return; } if (e.target === sh || e.target.closest('.lvs-x')) close(); };
          if (window.AtlasSfx) try { AtlasSfx.tap(); } catch (x) {}
        };
        return;
      }
      const sel = $(sid), tg = document.createElement('div'); tg.className = 'sidetg'; sel.hidden = true; sel.after(tg);
      const paint = () => { tg.innerHTML = [...sel.options].map(o => `<button type="button" data-v="${o.value}" class="${o.value === sel.value ? 'on' : ''}">${esc(o.textContent)}</button>`).join(''); };
      tg.onclick = e => { const b = e.target.closest('button'); if (!b) return; sel.value = b.dataset.v; sel.dispatchEvent(new Event('change')); paint(); if (window.AtlasSfx) try { AtlasSfx.tap(); } catch (x) {} };
      paint();
    });
    // house rules (adapter.house — ludo): a button that opens the game's own house-rules popup; disabled for sizes it does not apply to
    if ($('bvHouse') && ad && ad.house) {
      // (2026-11-09) the house-rules button sits in the level row; the rule / players choice is a row of its own (the card's 14px rhythm)
      const hp = () => { const z = $('bvSize') ? +$('bvSize').value : 0, on = ad.house.show(z); $('bvHouse').disabled = !on; const sm = on ? ad.house.summary(lang) : ''; $('bvHouse').querySelector('b').textContent = sm.replace(/\D+/g, ''); $('bvHouse').title = sm; };   // (the card: just the count — the level picker keeps its room)   // (pachisi: shown but off — the row keeps its shape)
      hp(); if ($('bvSize')) $('bvSize').addEventListener('change', hp);
      $('bvHouse').onclick = () => { if (window.AtlasSfx) try { AtlasSfx.tap(); } catch (x) {} ad.house.open(lang, hp, 'atlas'); };
    }
    if ($('bvLv')) {
      const sel = $('bvLv'), bt = document.createElement('button'); bt.type = 'button'; bt.className = 'lvpick'; sel.hidden = true; sel.after(bt);
      const paint = () => { const o = sel.options[sel.selectedIndex]; bt.innerHTML = `<span>${esc(matchMedia('(max-width: 819px)').matches ? 'Lv.' + sel.value : o ? o.textContent : '')}</span>${bossImg(id, +sel.value)}<i>▾</i>`; };   // (phones: just Lv.N + the opponent's face)
      sel.addEventListener('change', paint); paint();
      bt.onclick = () => {
        const max = ad.levels, cur = +sel.value;
        const sh = document.createElement('div'); sh.className = 'lvsheet'; sh.innerHTML = `<div class="lvs-in" role="listbox"><div class="lvs-h">${esc(t('bv.level'))}<button type="button" class="lvs-x" aria-label="${esc(t('bv.close'))}">✕</button></div><div class="lvs-l">${[...sel.options].map(o => {
          const n = +o.value, x = ad.levelInfo ? ad.levelInfo(n, lang) : null;
          return bossHead(id, n, cur) + `<button type="button" role="option" data-v="${n}" class="${n === cur ? 'on' : ''}"><b>Lv.${n}</b><span class="nm">${bossRw(id, n)}${esc(lvNm(x, n, lang, max))}${bossOwn(id, n) ? '<i class="lvck" aria-label="cleared">✓</i>' : ''}</span><span class="meter">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}" style="height:${Math.round(4 + 12 * (i + 1) / max)}px"></i>`).join('')}</span>${x ? `<small><em>${esc(x.who)}</em>${x.desc ? ` · ${esc(x.desc)}` : ''}${x.rating ? ` · ${t('bv.rating')} ${x.rating}` : ''}</small>` : ''}</button>`; }).join('')}</div></div>`;
        document.body.appendChild(sh); requestAnimationFrame(() => sh.classList.add('on'));
        const close = () => { if (sh.classList.contains('out')) return; sh.classList.add('out'); sh.classList.remove('on'); setTimeout(() => sh.remove(), 240); };
        sh.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { sel.value = b.dataset.v; sel.dispatchEvent(new Event('change')); close(); return; } if (e.target === sh || e.target.closest('.lvs-x')) close(); };
        const onB = sh.querySelector('.on'); if (onB) onB.scrollIntoView({ block: 'center' });
        bossTitles(sh, id);
      };
    }
    if ($('bvTc')) {   // time control for table play: a picker button + a list sheet (same UI as the level)
      const bt = $('bvTc');
      const paint = () => { bt.innerHTML = `<span>${esc(tcName(tcOf(ad, bt.dataset.v)))}</span><i>▾</i>`; };
      paint();
      bt.onclick = () => {
        const cur = bt.dataset.v, L = TCS[ad.clock];
        const sh = document.createElement('div'); sh.className = 'lvsheet tcsheet'; sh.innerHTML = `<div class="lvs-in" role="listbox"><div class="lvs-h">${esc(t('tc.h'))}<button type="button" class="lvs-x" aria-label="${esc(t('bv.close'))}">✕</button></div><div class="lvs-l">${L.map(c =>
          `<button type="button" role="option" data-v="${c.id}" class="${c.id === cur ? 'on' : ''}"><b>${c.id === 'none' ? '—' : '⏱'}</b><span class="nm">${esc(tcName(c))}</span><small>${esc(tcDesc(c))}</small></button>`).join('')}</div><div class="tcnote">${esc(t('tc.note'))}</div></div>`;
        document.body.appendChild(sh); requestAnimationFrame(() => sh.classList.add('on'));
        const close = () => { if (sh.classList.contains('out')) return; sh.classList.add('out'); sh.classList.remove('on'); setTimeout(() => sh.remove(), 240); };
        sh.onclick = e => { const b = e.target.closest('[data-v]'); if (b) { bt.dataset.v = b.dataset.v; pref[id + ':tc'] = b.dataset.v; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (x) {} paint(); close(); return; } if (e.target === sh || e.target.closest('.lvs-x')) close(); };
      };
    }
    if (ad && ad.levelInfo && $('bvLvInfo')) {   // how strong is this level?
      const show = () => { const n = +$('bvLv').value, x = ad.levelInfo(n, lang), max = ad.levels;
        $('bvLvInfo').innerHTML = `<span class="meter">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}" style="height:${Math.round(6 + 20 * (i + 1) / max)}px;width:${max > 12 ? 3 : 5}px"></i>`).join('')}</span><b>${esc(x.who)}</b><small>${esc(x.desc)}${x.rating ? ` · ${t('bv.rating')} ${x.rating}` : ''}</small>`; };
      $('bvLv').addEventListener('change', show); show();
      if ($('bvi').classList.contains('fold')) { const w = $('bvLvInfo').parentNode; if (w.classList.contains('lvw')) w.style.height = '0px'; }
    }
    fitStage();
    if ($('bvi').animate) $('bvi').animate([{ opacity: 0, translate: '0 36px' }, { opacity: 1, translate: '0 0' }], { duration: 380, delay: flown ? 260 : 0, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
    $('bvQuit').textContent = t('bv.quit'); $('bvClose').setAttribute('aria-label', t('bv.close')); renderTod(); renderPlace();
    if (window.Historia) Historia.sync(g, lang, { art: artSrc, name: gname, fit: fitStage });   // the ヒストリア button (atlas/historia.js) opens this game's history
    if (window.AtlasGameList && AtlasGameList.sheetActions) { AtlasGameList.sheetActions($('bvi'), t); fitStage(); }   // PC: ヒストリア under ルール + ring; tags on one quiet line
    playSheet(g, ad, r);
  }
  // in view mode the canvas only covers the area not taken by the info card (below it on phones, beside it on wide screens)
  // a level's name: kyu / dan for the Japanese games (shogi, go, gomoku); the games numbered Lv.1 … Lv.N (their name is 'Lv.N')
  // get a tier word instead (5 tiers over the levels)
  const LV_TIER = { ja: ['入門', '初級', '中級', '上級', '最上級'], en: ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Expert'],
    zh: ['入门', '初级', '中级', '高级', '专家'], ko: ['입문', '초급', '중급', '상급', '전문가'],
    es: ['Iniciación', 'Principiante', 'Intermedio', 'Avanzado', 'Experto'], fr: ['Initiation', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
    pt: ['Iniciação', 'Iniciante', 'Intermediário', 'Avançado', 'Especialista'], de: ['Einstieg', 'Anfänger', 'Mittelstufe', 'Fortgeschritten', 'Experte'],
    hi: ['परिचय', 'शुरुआती', 'मध्यम', 'उन्नत', 'विशेषज्ञ'], ar: ['تمهيدي', 'مبتدئ', 'متوسط', 'متقدم', 'خبير'], ru: ['Начальный', 'Новичок', 'Средний', 'Продвинутый', 'Эксперт'], 'zh-TW': ['入門', '初級', '中級', '高級', '最高級'], id: ['Pemula', 'Dasar', 'Menengah', 'Mahir', 'Ahli'], tr: ['Başlangıç', 'Acemi', 'Orta', 'İleri', 'Uzman'] };
  // the AI boss of a level band (npc/roster.js): a header above the band's first level in the level sheet
  function bossHead(g, n, cur) {
    const N = window.AtlasNPC, L = N && N.BOSSES && N.BOSSES[g];
    if (!L || (n - 1) % 3) return '';
    const i = N.band(g, n), b = L[i], top = i === L.length - 1, on = N.band(g, cur) === i;
    return `<div class="lvs-boss${top ? ' ur' : ''}${on ? ' on' : ''}" data-bi="${i}"><img src="../images/atlas/av/${N.bossId(g, i)}-${top ? 3 : 2}.webp?v=1" alt="" loading="lazy"><div><span>${esc(N.range(g, i))}${top ? ' <i>UR</i>' : ''}</span><b>${esc(b.n[lang] || b.n.en)}</b><small></small></div></div>`;
  }
  function bossImg(g, n) {   // the level's boss, small, in the level button (the N / R / SR a win there gives)
    const N = window.AtlasNPC; if (!N || !N.tier || !(N.BOSSES || {})[g] || !n) return '';
    return `<img class="lvb" src="../images/atlas/av/${N.bossId(g, N.band(g, n))}-${N.tier(g, n)}.webp?v=1" alt="">`;
  }
  function bossOwn(g, n) { const N = window.AtlasNPC; if (!N || !N.tier || !(N.BOSSES || {})[g]) return false; return (W.owned || []).includes(`av-${N.bossId(g, N.band(g, n))}-${N.tier(g, n)}`); }
  function bossRw(g, n) {   // what a win at this level gives: the boss's N / R / SR (dimmed once owned; the ✓ sits after the name — 2026-11-10)
    const N = window.AtlasNPC; if (!N || !N.tier || !(N.BOSSES || {})[g]) return '';
    const t = N.tier(g, n);
    return `<i class="rw r${t}${bossOwn(g, n) ? ' got' : ''}">${['N', 'R', 'SR'][t]}</i>`;
  }
  function bossTitles(sh, g) {   // the bosses' titles live in the talk's language files (npc/t/<lang>.js), loaded on demand
    const N = window.AtlasNPC; if (!N || !N.ensure || !sh.querySelector('.lvs-boss')) return;
    N.ensure(N.lang()).then(() => { const T = N.T && (N.T[N.lang()] || N.T.en), L = T && T.bosses && T.bosses[g]; if (!L) return;
      sh.querySelectorAll('.lvs-boss').forEach(h => { const s = h.querySelector('small'); if (s) s.textContent = L[+h.dataset.bi] || ''; }); }).catch(() => {});
  }
  function lvNm(x, n, lang, max) {
    if (!x || !x.name) return '';
    if (x.name !== 'Lv.' + n) return x.name;
    const T = LV_TIER[lang] || LV_TIER.en; return T[Math.min(4, Math.floor((n - 1) * 5 / (max || 20)))];
  }
  function fitStage() {   // the board is framed above the info card (the canvas itself stays full-screen: no seams)
    if (!glOK) return;
    if (window.Historia && Historia.on) return Historia.fit();   // ヒストリア open: it frames the board itself
    const card = $('bvi'), playing = $('bv').classList.contains('playing');
    if ($('bv').classList.contains('rules')) { const p = $('bv').querySelector('.rgd'); Table3D.setInset(p ? $('bv').clientHeight - p.offsetTop + 4 : 0); return; }
    // the card's resting top (layout only: its slide-in animation must not move the framing — that made the camera return in two steps)
    let top = 0; for (let e = card; e; e = e.offsetParent) top += e.offsetTop;
    if (!card.offsetParent) top = card.getBoundingClientRect().top;
    Table3D.setInset(playing ? (window.__tbar ? __tbar.band : 0) : !$('bv').classList.contains('on') ? 0 : innerHeight - top + 4, playing ? (window.__land && __land.top()) || (window.__hudTop ? __hudTop() : 0) : 0);   // playing: the board is framed above the action bar
    $('bv').style.setProperty('--bvcard', Math.max(0, innerHeight - top) + 'px');
  }
  addEventListener('resize', () => fitStage());
  // games opened from here (cards, puzzles …) send their home button back here instead of the top page (shared/homeback.js)
  const homeMark = () => { try { sessionStorage.setItem('aicoding-home', location.pathname + '#' + page); } catch (e) {} };
  homeMark(); addEventListener('pagehide', homeMark);
  // games that have the full portal skin open the complete game (lessons, puzzles, online …) on the 3D table
  // 戦績 (the cup): on phones under the ヒストリア pill (top left); on PC beside the place chip
  function placeRec() { const r = $('bvRec'), hw = $('bvHistW'), td = $('bvTodW'); if (!r || !hw || !td || r.classList.contains('inhd')) return;
    if (matchMedia('(max-width: 819px)').matches) { if (r.parentNode !== hw) hw.appendChild(r); } else if (r.parentNode !== td) $('bvPlBtn').after(r); }   // phones: under ヒストリア, left-aligned (2026-11-10)
  addEventListener('resize', placeRec);
  /* ---------- phones: the 「あそぶ」 sheet (2026-11-09) ----------
     A game whose full version has puzzles / lessons playable on the 3D table (PS_GAMES) keeps the card short: one 「あそぶ ▶」
     button (+ 2D). It opens a sheet from the bottom with three ways to play: 対局 (the mode tabs, level, side and time control —
     the card's own nodes, moved in, so startPlay reads them as before — and the full / chabudai buttons), パズル and レッスン
     (the full game in the 3D skin, opened straight at its puzzle / lesson list). Analysis and the other deep features stay in
     the full version only. PC keeps the card as it is (its layout is on hold). */
  // with the sheet the card's title row has room: ルール on top, 戦績 and ヒストリア under it (2026-11-10)
  function headIcons(on) {
    const hb = $('bvHist'), rb = $('bvRec'), hw = $('bvHistW');
    if (!on) { if (hb && hw && hb.parentNode !== hw) hw.prepend(hb); [hb, rb].forEach(b => b && b.classList.remove('inhd')); placeRec(); return; }
    const row = $('bvi').querySelector('.L .row'), ru = row && row.querySelector('.rulesb'); if (!row || !ru) return;
    // two rows on the right: ルール, then 戦績 → ヒストリア (with its label) under it (2026-11-10)
    const col = document.createElement('div'); col.className = 'hdcol'; ru.before(col);
    const sub = document.createElement('div'); sub.className = 'hdsub'; col.append(ru, sub);
    [rb, hb].forEach(b => { if (b) { b.classList.add('inhd'); sub.appendChild(b); } });
  }
  const PS_GAMES = { shogi: true, chess: true };
  function playSheet(g, ad, r) {
    const old = $('bvPS'); if (old) old.remove();
    if (!PS_GAMES[g.id] || !ad || !FULL_SKIN[g.id] || !matchMedia('(max-width: 819px)').matches) return;
    const act = $('bvi').querySelector('.R .act'); if (!act || !$('bvFull')) return;
    // headIcons(true);   // (ヒストリア / 戦績 in the card: tried, back to the top left for now — 2026-11-10)
    const row = (k, ic, lb, a, b) => `<button type="button" class="ps-row" data-k="${k}"><span class="ps-ic" style="--c:${g.color}">${ic}</span><span class="ps-tx"><b>${esc(lb)}</b><small>${esc(t(k === 'puzzle' && window.AtlasPuzzles && AtlasPuzzles.has(g.id) && ad.table ? 'ps.here' : 'ps.full'))}</small></span>${b ? `<span class="ps-pg"><span class="bar" style="--c:${g.color}"><i style="width:${Math.min(100, a / b * 100)}%"></i></span><em>${Math.min(a, b).toLocaleString()}/${b.toLocaleString()}</em></span>` : ''}<i class="ps-cv"></i></button>`;
    const PZI = '<svg viewBox="0 0 24 24"><path d="M10 3h4v2.2a1.8 1.8 0 1 0 3.6 0V3H21v6h-2.2a1.8 1.8 0 1 0 0 3.6H21V21h-6v-2.2a1.8 1.8 0 1 0-3.6 0V21H3v-6h2.2a1.8 1.8 0 1 0 0-3.6H3V3h7z"/></svg>';
    const LSI = '<svg viewBox="0 0 24 24"><path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 11.6V16c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4.4M21 9.5V15"/></svg>';
    const ps = document.createElement('div'); ps.className = 'psheet'; ps.id = 'bvPS';
    ps.innerHTML = `<div class="ps-in bvi" role="dialog" aria-label="${esc(t('ps.h'))}"><div class="ps-h">${esc(t('ps.h'))}<button type="button" class="lvs-x" aria-label="${esc(t('bv.close'))}">✕</button></div>
      <div class="ps-sec"><div class="ps-t">${esc(t('ps.vs'))}</div><div class="ps-body"></div><div class="ps-act"></div></div>
      ${g.total.pz ? row('puzzle', PZI, t('pg.pz'), r.pz || 0, g.total.pz) : ''}${g.total.ls ? row('lesson', LSI, t('pg.ls'), r.ls || 0, g.total.ls) : ''}</div>`;
    $('bv').appendChild(ps);
    const body = ps.querySelector('.ps-body'), pa = ps.querySelector('.ps-act');
    ['bvMode', 'bvMBody', 'bvSzRow'].forEach(i => { if ($(i)) body.appendChild($(i)); });
    pa.append($('bvFull')); if ($('bvTable')) pa.append($('bvTable'));
    const cls = $('bvi').querySelector('.R .act > a.btn');   // 2Dで遊ぶ stays on the card
    act.className = 'act act2';
    const go = document.createElement('button'); go.className = 'btn big'; go.id = 'bvGo'; go.textContent = t('ps.go') + ' ▶'; act.prepend(go);
    if (cls) { cls.querySelectorAll('small').forEach(x => x.remove()); cls.classList.remove('pk'); }
    const close = () => ps.classList.remove('on');
    go.onclick = () => { ps.classList.add('on'); if (window.__bvModeRz) window.__bvModeRz(); try { SFX.tap && SFX.tap(); } catch (e) {} };
    ps.onclick = e => { const b = e.target.closest('.ps-row'); if (b) { try { SFX.tap && SFX.tap(); } catch (x) {} if (b.dataset.k === 'puzzle' && window.AtlasPuzzles && AtlasPuzzles.has(g.id) && ad.table) startPuzzle(); else startPlay('full', b.dataset.k); return; } if (e.target === ps || e.target.closest('.lvs-x')) close(); };
    if (window.__bvModeRz) setTimeout(window.__bvModeRz, 0);
  }
  const FULL_SKIN = { ludo: true, reversi: true, shogi: true, chess: true, backgammon: true, gomoku: true, go: true, morris: true, connect4: true, checkers: true, mancala: true, dots: true, xiangqi: true, janggi: true, hex: true, tafl: true, ur: true, senet: true, fanorona: true, ugolki: true, agon: true, alquerque: true, konane: true };
  let lastKind;
  function startPlay(kind, over) {   // over: 'puzzle' | 'lesson' — the 「あそぶ」 sheet opens the full game straight at its puzzles / lessons
    if (renderPlace.close) renderPlace.close();
    if ($('bvPS')) $('bvPS').classList.remove('on');
    const g = bvGame, ad = Atlas3D[g.id];
    if (FULL_SKIN[g.id] && !(kind === 'table' && ad.table)) {
      const lv = $('bvLv') ? +$('bvLv').value : 0, side = $('bvSide') ? +$('bvSide').value : 1, mode = over || ($('bvMode') ? $('bvMode').dataset.v : 'ai'), size = $('bvSize') ? +$('bvSize').value : 0;
      if (!over) pref[g.id + ':mode'] = mode; pref[g.id + ':lv'] = lv; pref[g.id + ':side'] = side; if (size) pref[g.id + ':size'] = size; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (e) {}
      if (window.AtlasLoading) AtlasLoading.show(lang);   // straight to the loading screen (no camera move behind it)
      setTimeout(() => { location.href = '../' + g.href + '?skin=atlas' + (mode !== 'ai' ? '&mode=' + mode : (lv ? '&lv=' + lv : '') + '&side=' + side + (size ? '&size=' + size : '')); }, 420);
      return;
    }
    if (pend3d) { pend3d.then(() => startPlay(kind)); return; }   // the board isn't on the table yet
    const level = +$('bvLv').value, side = $('bvSide') ? +$('bvSide').value : 1, pmode = $('bvMode') ? $('bvMode').dataset.v : 'ai', size = $('bvSize') ? +$('bvSize').value : 0;
    pref[g.id + ':lv'] = level; pref[g.id + ':side'] = side; pref[g.id + ':mode'] = pmode; if (size) pref[g.id + ':size'] = size; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (e) {}
    lastKind = kind;
    const tc = tcOf(ad, $('bvTc') ? $('bvTc').dataset.v : pref[g.id + ':tc']), tcT = new URLSearchParams(location.search).get('tcTest');
    const clock = tcT ? { id: 'test', byo: +tcT } : tc;   // (tests: ?tcTest=5 → 5 s per move)
    if ($('bvTc')) { pref[g.id + ':tc'] = $('bvTc').dataset.v; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (e) {} }
    $('bv').classList.add('playing'); $('endc').classList.remove('on');
    LAND.game(ad.land || ''); fitStage();
    let sess = null, tbOn = false;
    // AI games: the level's boss and a watching creature talk now and then (atlas/npc/npc.js); beating the boss gives its SR avatar
    if (npcT) npcT.kill();
    npcT = pmode === 'ai' && window.AtlasNPC && AtlasNPC.portal ? AtlasNPC.portal({ game: g.id, level }) : null;
  // phones: a HUD message too long for its slot moves to a popup just above the HUD (the slot is left empty) — 2026-11-07
  let hudPopT = 0, hudPopTxt = '';
  // the game's own bar along the top (the players / whose turn): the board is framed below it as well (2026-11-09: boards sat low)
  let hudTopV = 0;
  const hudTop = window.__hudTop = function () { const h = $('hud'); if (!h || !h.childElementCount) return 0; const r = h.getBoundingClientRect(); return r.height && r.bottom < innerHeight * .3 ? Math.round(r.bottom + 6) : 0; };
  function hudFit() {
    { const hd0 = $('hud'); if (hd0) { hd0.style.zoom = ''; hd0.style.removeProperty('max-width'); const A = hd0.clientWidth, Wn = hd0.scrollWidth; if (matchMedia('(max-width: 560px)').matches && !$('bv').classList.contains('land') && A && Wn > A + 2) { const z = Math.max(.72, A / Wn); hd0.style.zoom = z.toFixed(3); hd0.style.setProperty('max-width', Math.floor(A / z) + 'px', 'important'); } } }   // (phones: the HUD at the top left, beside やめる — a long one is scaled down to fit)
    if ($('bv').classList.contains('playing') && hudTop() !== hudTopV) { hudTopV = hudTop(); fitStage(); }
    const hm = $('hud') && $('hud').querySelector('.hm, .hmsg'), old = document.getElementById('hudPop');
    const txt = hm ? hm.textContent.trim() : '';
    const hd = $('hud'); if (!hm || !txt || !matchMedia('(max-width: 600px)').matches || (hm.scrollWidth <= hm.clientWidth + 2 && hd.scrollWidth <= hd.clientWidth + 2)) { if (old && txt !== hudPopTxt) { old.remove(); hudPopTxt = ''; } return; }
    hm.textContent = '';
    if (old && txt === hudPopTxt) return;
    if (old) old.remove();
    const el = document.createElement('div'); el.id = 'hudPop'; el.className = 'hudpop'; el.textContent = txt; el.setAttribute('role', 'status');
    const r = $('hud').getBoundingClientRect(); if (r.top < innerHeight * .3) { el.style.top = Math.round(r.bottom + 8) + 'px'; el.style.bottom = 'auto'; } else el.style.bottom = Math.round(innerHeight - r.top + 10) + 'px';   // (below a HUD at the top)
    el.onclick = () => el.remove(); document.body.appendChild(el); hudPopTxt = txt;
    clearTimeout(hudPopT); hudPopT = setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); if (hudPopTxt === txt) hudPopTxt = ''; }, 300); }, Math.max(3500, txt.length * 120));
  }

    session = sess = ad.start({ el: $('gl'), Table3D, lang, t, level, side, size, mode: pmode, bar: true, hud: h => { $('hud').innerHTML = h; hudFit(); if (tbOn && session === sess) TB.sync(); },   // (the bar's buttons follow every state change at once)
      onTurn: (s, info) => { if (tbOn && session === sess) TB.turn(s, info); if (npcT && session === sess && info) npcT.turn(info.ply); },
      onEnd: res => {
        if (session === sess) TB.end();
        if (!res.pvp) { A_.recordPlay(W, g.id, res); recPush(g.id, { mode: pmode === 'rated' ? 'rated' : 'ai', res: res.draw ? 'd' : res.win ? 'w' : 'l', side: side === 2 ? 1 : 0, opp: 'AI Lv.' + (res.level || level), key: (pmode === 'rated' ? 'rt:' : 'ai:') + (res.level || level), why: String(res.score || '').replace(/<[^>]*>/g, '').slice(0, 60), via: '3d' }); }
        refresh();   // two players on one device: no win / loss for the player's record
        if (npcT && session === sess && !res.pvp) { npcT.end(res); W = A_.load(); refresh(); }   // (a boss beaten: its N / R / SR was added to the saved wallet)
        setTimeout(() => {
          if (session !== sess) return;
          TB.hide();
          const head = res.pvp ? (res.draw ? t('res.draw') : '🎉 ' + (res.winnerText || res.score || '')) : (res.win ? '🎉 ' : '') + t(res.draw ? 'res.draw' : res.win ? 'res.win' : 'res.lose');
          $('endc').innerHTML = `<h3>${esc(head)}</h3>${res.score && !(res.pvp && !res.winnerText && !res.draw) ? `<div class="sc">${esc(res.score)}</div>` : ''}${res.pvp ? '' : `<div class="gnote">Lv.${res.level}</div>`}
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" id="eBack">${t('bv.quit')}</button><button class="btn" id="eAgain">${t('bv.again')}</button></div>`;
          $('endc').classList.add('on'); if (res.win || (res.pvp && !res.draw)) confetti(120);
          try { SFX[res.draw ? 'draw' : res.win || res.pvp ? 'win' : 'lose'](); } catch (e) {}   // (respects the sound setting)
          $('eAgain').onclick = () => { stopSession(); Table3D.show(g.id); setTimeout(() => startPlay(lastKind), 50); };
          $('eBack').onclick = () => openBoard(g.id);
          welcome();
        }, 900);
      } });
    TB.on(sess, clock, pmode === 'pvp' ? -1 : sess.human != null ? sess.human : side === 2 ? 1 : 0); tbOn = true;   // the human's HUD pill (left when playing first, unless the adapter says)
    LAND.sync();
    Table3D.play(true);   // after start(): the adapter puts its own board on the table
  }
  let npcT = null;
  function stopSession() { if (npcT) { npcT.kill(); npcT = null; } TB.off(); if (session) { session.stop(); session = null; } LAND.game(''); $('hud').innerHTML = ''; $('bv').classList.remove('rules'); }

  /* ---------- table play: time controls, clocks and the action bar (待った · 投了 · ヒント), one implementation for every game ----------
     Adapter session API (atlas/games/*.js): undo() canUndo() · hint() → Promise canHint() · resign() canResign() · timeout(side).
     The adapter calls ctx.onTurn(side, { human, ply }) whenever the side to move changes (side 0 = the left pill of its HUD,
     1 = the right one; side -1 = nobody, e.g. the game just ended) — the clock here runs the time and flags a loss on time. */
  const TCS = {   // per game (adapter.clock): the time controls its full version offers
    byo: [{ id: 'none' }, { id: 'b30', byo: 30 }, { id: 'm10', main: 600, byo: 30 }, { id: 'm30', main: 1800, byo: 60 }],      // reversi, shogi
    fis: [{ id: 'none' }],   // chess, gomoku … (Fischer only)
    bg: [{ id: 'none' }, { id: 'b30', byo: 30 }, { id: 'm5', main: 300, byo: 30 }, { id: 'm10', main: 600, byo: 30 }],           // backgammon
  };
  // every game also offers the Fischer presets (common rule 持ち時間のフィッシャー, shared/fischer.js: 1+1 3+2 5+3 10+5 15+10 30+20;
  // ids f3 / f10 / f15 kept from before 2026-11-08)
  const FIS_TC = [[1, 1], [3, 2], [5, 3], [10, 5], [15, 10], [30, 20]].map(([m, s]) => ({ id: 'f' + m, main: m * 60, inc: s }));
  for (const k in TCS) TCS[k].push(...FIS_TC);
  const tcOf = (ad, id) => { const L = ad && TCS[ad.clock]; if (!L) return null; return L.find(c => c.id === id) || L[0]; };
  const tcName = c => !c || (!c.main && !c.byo) ? t('tc.none') : c.inc ? t('tc.fis', { m: c.main / 60, s: c.inc }) : !c.main ? t('tc.byo', { s: c.byo }) : t('tc.mb', { m: c.main / 60, s: c.byo });
  const tcDesc = c => !c || (!c.main && !c.byo) ? t('tc.noneD') : c.inc ? t('tc.fisD', { m: c.main / 60, s: c.inc }) : !c.main ? t('tc.byoD', { s: c.byo }) : t('tc.mbD', { m: c.main / 60, s: c.byo });
  const TB = (() => {
    const IC = {
      undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
      hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
    };
    const bar = document.createElement('div'); bar.className = 'tbar'; bar.id = 'tbar';
    bar.innerHTML = '<span class="tclk" data-s="0" hidden></span><span class="tbtns"><button type="button" data-a="undo"></button><button type="button" data-a="resign"></button><button type="button" data-a="hint"></button><button type="button" data-a="draw" hidden></button></span><span class="tclk" data-s="1" hidden></span>';
    $('bv').appendChild(bar);
    const ck = [...bar.querySelectorAll('.tclk')], btn = k => bar.querySelector(`[data-a="${k}"]`);
    let S = null, ended = false, hinting = false, drawing = false, iv = 0, ro = null;
    // the clock: tc = { main, byo, inc } (s) · left[s] = main time left (ms) · the side to move's turn started at t0
    const C = { tc: null, left: [0, 0], side: -1, key: '', human: false, t0: 0, show: [false, false], pvp: false, flagged: false };
    const now = () => performance.now();
    function used() { return C.side >= 0 && C.human ? now() - C.t0 : 0; }
    function remain(s) {   // { ms: what is shown, byo: in the byoyomi, flag: ms until a loss on time (Infinity: never) }
      const tc = C.tc, u = s === C.side ? used() : 0, m = C.left[s] - u;
      if (m > 0) return { ms: m, byo: false, flag: tc.byo ? Infinity : m, main: true };
      if (tc.byo) { const b = tc.byo * 1000 + m; return { ms: Math.max(0, b), byo: true, flag: b }; }
      return { ms: 0, byo: false, flag: m };
    }
    function settle() {   // the side to move's turn ends: charge its time (Fischer: + increment)
      if (C.side < 0 || !C.tc || !C.human) return;
      const s = C.side, m = C.left[s] - used();
      C.left[s] = m > 0 ? m + (C.tc.inc || 0) * 1000 : C.tc.byo ? 0 : 0;
      if (window.CountTick) CountTick.reset('tb' + s);
    }
    function turn(side, info) {
      if (!S || ended) return;
      info = info || {};
      const key = side + ':' + (info.ply == null ? '' : info.ply);
      if (side === C.side && key === C.key) return;   // the same turn reported again
      settle();
      C.side = side; C.key = key; C.human = side >= 0 && (C.pvp || !!info.human); C.t0 = now();
      sync();
    }
    const fmt = ms => { const s = Math.ceil(ms / 1000 - 1e-6), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
    function sync() {
      if (!S) return;
      // clocks
      if (C.tc) for (const s of [0, 1]) {
        const el = ck[s]; el.hidden = !C.show[s]; if (!C.show[s]) continue;
        const r = remain(s), on = s === C.side && !ended, low = on && (r.byo ? r.ms <= 10000 : !C.tc.byo && r.ms <= 10000);
        const txt = r.byo ? `<small>${esc(t('tc.byoS'))}</small>${Math.ceil(r.ms / 1000 - 1e-6)}` : fmt(r.ms);
        if (el._t !== txt) { el.innerHTML = txt; el._t = txt; }
        el.classList.toggle('on', on); el.classList.toggle('low', low); el.classList.toggle('byo', r.byo);
        if (on && C.human && window.CountTick) CountTick.feed(r.flag, 'tb' + s);
        if (on && C.human && r.flag <= 0 && !C.flagged) { C.flagged = true; const sd = s; setTimeout(() => { if (S && !ended && S.timeout) { turn(-1); S.timeout(sd); } }, 0); }
      }
      // buttons
      const can = k => !!(S && !ended && S[k] && S[k]());
      btn('undo').disabled = !can('canUndo');
      btn('hint').disabled = hinting || !can('canHint'); btn('hint').classList.toggle('busy', hinting);
      btn('resign').disabled = ended || (S.canResign ? !S.canResign() : false);
      btn('draw').hidden = !S.offerDraw; btn('draw').disabled = drawing || !can('canDraw');   // 引き分け: games with draws (adapter offerDraw / draw)
    }
    function paint() {
      btn('undo').innerHTML = `${IC.undo}<span>${esc(t('act.undo'))}</span>`;
      btn('resign').innerHTML = `${window.Resign ? Resign.icon : ''}<span>${esc(window.Resign ? Resign.label(lang) : t('act.resigned'))}</span>`;
      btn('hint').innerHTML = `${IC.hint}<span>${esc(t('act.hint'))}</span>`;
      btn('draw').innerHTML = `${window.DrawOffer ? DrawOffer.icon : ''}<span>${esc(window.DrawOffer ? DrawOffer.tx('btn', lang) : t('res.draw'))}</span>`;
      ['undo', 'resign', 'hint', 'draw'].forEach(k => { const b = btn(k); b.setAttribute('aria-label', b.textContent); b.title = b.textContent; });
    }
    // where the bar sits: the bottom centre (the board is framed above it); the backgammon landscape views: a slim column
    // at the landscape left, mirroring the HUD column on the right
    function place() {
      const bv = $('bv'), pl = bv.classList.contains('pland'), col = !pl && (bv.classList.contains('land') || bv.classList.contains('bgwide'));
      bar.classList.toggle('col', col);
      const band = bv.classList.contains('tbon') && !col && !pl ? bar.offsetHeight + 14 + 8 : 0;   // (phone landscape: the bar is in the game bar at the top)
      bv.style.setProperty('--tbh', band + 'px');
      const hudR = $('hud').getBoundingClientRect(), phoneHud = !col && !pl && innerWidth <= 560;
      document.documentElement.style.setProperty('--tbclear', (col || pl ? 18 : phoneHud ? innerHeight - hudR.top + 4 : band + 4) + 'px');   // toasts stay clear of the bar (and the HUD below on phones)
      fitStage();
    }
    bar.addEventListener('click', e => {
      const b = e.target.closest('button[data-a]'); if (!b || b.disabled || !S || ended) return;
      e.stopPropagation();
      const a = b.dataset.a, s = S;
      if (a === 'undo') { if (s.canUndo()) { s.undo(); SFX.tok(); } }
      else if (a === 'hint') {
        if (!s.canHint()) return; hinting = true; sync(); SFX.tok();
        Promise.resolve(s.hint()).then(ok => { if (ok === false && S === s) toast(t('act.noHint')); }).catch(() => {}).then(() => { hinting = false; if (S === s) sync(); });
      }
      else if (a === 'draw') {   // 2人対局：合意の確認 → 引き分け。AI 対局：AI に提案（形勢を見て同意 / 断る）
        if (!s.canDraw || !s.canDraw()) return;
        const D = k => window.DrawOffer ? DrawOffer.tx(k, lang) : k;
        if (C.pvp) {
          const go = () => { if (S === s && !ended && s.canDraw()) { turn(-1); s.draw(); } };
          if (window.Resign) Resign.confirm({ lang, kind: 'draw', icon: window.DrawOffer && DrawOffer.icon, question: D('q'), note: D('sub') }).then(ok => { if (ok) go(); }); else go();
        } else {
          drawing = true; sync(); SFX.tok();
          Promise.resolve(s.offerDraw()).then(r => {
            drawing = false;
            if (S !== s || ended) return;
            if (r === 'yes') { toast(D('aiYes')); turn(-1); s.draw(); } else toast(D(r === 'wait' ? 'wait' : 'aiNo'));
            sync();
          }).catch(() => { drawing = false; if (S === s) sync(); });
        }
      }
      else if (a === 'resign') {
        const go = () => { if (S === s && !ended && (!s.canResign || s.canResign())) { turn(-1); s.resign(); } };
        if (window.Resign) Resign.confirm({ lang }).then(ok => { if (ok) go(); }); else go();
      }
      sync();
    });
    return {
      // a table game starts: tc = the chosen time control (null: none), human = the player's side (-1: two players)
      on(sess, tc, human) {
        S = sess; ended = false; hinting = false; drawing = false; C.tc = tc && (tc.main || tc.byo) ? tc : null; C.side = -1; C.key = ''; C.flagged = false; C.pvp = human < 0;
        C.left = [0, 1].map(() => C.tc ? (C.tc.main || 0) * 1000 : 0); C.show = [0, 1].map(s => !!C.tc && (C.pvp || s === human));
        if (window.CountTick) { CountTick.reset(); CountTick.setMuted(() => !SFX.on); }
        paint(); ck.forEach(el => { el.hidden = true; el._t = ''; });
        $('bv').classList.add('tbon'); sync(); place(); setTimeout(place, 60);
        clearInterval(iv); iv = setInterval(() => { if (S) sync(); }, 200);
        if (!ro && window.ResizeObserver) { ro = new ResizeObserver(() => { if (S) place(); }); ro.observe(bar); ro.observe($('hud')); }
      },
      turn, sync,
      end() { if (!S) return; turn(-1); ended = true; sync(); },   // the game is over: buttons off, the clock stops
      hide() { $('bv').classList.remove('tbon'); },                 // the end card is up
      off() { clearInterval(iv); iv = 0; if (S) turn(-1); S = null; ended = true; C.tc = null; $('bv').classList.remove('tbon'); $('bv').style.setProperty('--tbh', '0px'); document.documentElement.style.removeProperty('--tbclear'); if (window.CountTick) CountTick.reset(); },
      place,
      get band() { return $('bv').classList.contains('tbon') && !bar.classList.contains('col') && !$('bv').classList.contains('pland') ? parseFloat($('bv').style.getPropertyValue('--tbh')) || 0 : 0; },
      _dbg: () => ({ side: C.side, human: C.human, left: C.left.slice(), tc: C.tc, show: C.show.slice(), ended, r: C.tc ? [remain(0), remain(1)] : null, undo: !btn('undo').disabled, hint: !btn('hint').disabled, resign: !btn('resign').disabled }),
    };
  })();
  window.__tbar = TB;   // (tests)

  /* ---------- table play on a phone held sideways: the full game's landscape layout (atlas/skin, html.atlas-land) ----------
     The adapter names its game's look (Atlas3D[id].land):
       'pill' (backgammon)  row 1 = a slim pill (logo · portal title · game name · sound · やめる) + the player chips,
                            row 2 = the status line + the action bar as small icon pills; the board fills the rest
       'bar'  (mancala)     one full-width bar (logo | 待った · 投了 · ヒント | sound · やめる); names, counts and the turn
                            message are on the board itself (the adapter draws them)
       'side' (ur)          row 1 = the slim pill + the action bar as icon pills; the player cards (the adapter's HUD) in a
                            column at the left; the board is framed in the room right of it (Table3D.setShift)
     #hud and #tbar move into the bar (#hud as display:contents, so its pills and message become grid cells); the camera keeps
     the bar's band free (Table3D.setInset(0, top)). The adapter reads #bv.pland and listens to the 'atlasland' event. */
  const LAND = (() => {
    const Q = matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px)');
    const HOME = '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/></svg>';
    const KW = { en: 'Board Game Atlas', es: 'Juegos de Mesa', fr: 'Jeux de société', pt: 'Jogos de Tabuleiro', de: 'Brettspiel-Atlas' };   // (the kicker-style titles: the main line, as the 2D page's landscape pill)
    const wrap = document.createElement('div'); wrap.className = 'pl'; wrap.id = 'pl';
    wrap.innerHTML = '<div class="plb"><img src="logo.svg" alt="" width="26" height="26"><span class="plt"><b></b><em></em></span><span class="sp"></span>'
      + (window.PhoneSnd && PhoneSnd.phone ? '' : '<button type="button" class="plic" data-pl="snd"></button>') + '<button type="button" class="plic" data-pl="quit">' + HOME + '</button></div>';
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-pl]'); if (!b) return;
      e.stopPropagation();
      if (b.dataset.pl === 'snd') { $('sfxBtn').click(); paint(); } else $('bvQuit').click();
    });
    let want = '', style = '';
    function paint() {
      if (!style) return;
      wrap.querySelector('.plt b').textContent = KW[lang] || t('title');
      wrap.querySelector('.plt em').textContent = bvGame ? gname(bvGame).replace(/\s*V\d+$/, '') : '';   // (the game's own name, as its page shows it)
      const sb = wrap.querySelector('[data-pl=snd]'), q = wrap.querySelector('[data-pl=quit]');
      if (sb) { sb.innerHTML = $('sfxBtn').innerHTML; sb.classList.toggle('off', $('sfxBtn').classList.contains('off'));
      sb.setAttribute('aria-label', $('sfxBtn').getAttribute('aria-label') || ''); sb.title = sb.getAttribute('aria-label'); }
      q.setAttribute('aria-label', t('bv.quit')); q.title = t('bv.quit');
    }
    function sync() {
      const bv = $('bv'), st = want && Q.matches && bv.classList.contains('playing') && !bv.classList.contains('rules') ? want : '';
      if (st === style) { paint(); return; }
      style = st;
      bv.classList.toggle('pland', !!st); bv.classList.toggle('pl-pill', st === 'pill'); bv.classList.toggle('pl-bar', st === 'bar'); bv.classList.toggle('pl-side', st === 'side');
      document.documentElement.classList.toggle('bv-pland', !!st);
      if (st) { bv.appendChild(wrap); wrap.appendChild($('hud')); wrap.appendChild($('tbar')); paint(); }
      else if (wrap.parentNode) { bv.insertBefore($('hud'), $('bvi')); bv.appendChild($('tbar')); wrap.remove(); }
      try { TB.place(); } catch (e) {}
      shift(); fitStage();
      dispatchEvent(new Event('atlasland'));   // (the adapter re-frames its board)
    }
    // 'side': the board is framed in the room right of the player column (a shift lens, as Historia's page beside the board)
    let shifted = false;
    function shift() {
      if (style === 'side') { const r = $('hud').getBoundingClientRect(), b = $('bv').getBoundingClientRect(); if (r.width) { Table3D.setShift(Math.round((r.right - b.left + 4) / 2)); shifted = true; } }
      else if (shifted) { Table3D.setShift(0); shifted = false; }
    }
    const onQ = () => { sync(); setTimeout(() => { try { TB.place(); } catch (e) {} shift(); fitStage(); }, 120); };
    if (Q.addEventListener) Q.addEventListener('change', onQ); else Q.addListener(onQ);
    if (window.ResizeObserver) new ResizeObserver(() => { if (style) { shift(); fitStage(); } }).observe(wrap);
    return {
      game(st) { want = st || ''; sync(); },   // the table game's landscape look ('' = none / the game ended)
      sync,
      get on() { return !!style; },
      top() { return style && wrap.parentNode ? Math.round((style === 'side' ? wrap.querySelector('.plb') : wrap).getBoundingClientRect().bottom - $('bv').getBoundingClientRect().top + 6) : 0; },   // px kept free above the board ('side': the top row only)
      query: Q,
    };
  })();
  window.__land = LAND;   // (the adapters: __land.on / __land.top())
  // back from a game (page restored from the back-forward cache): drop the loading screen and the "playing" state,
  // so the board viewer shows its info card again instead of a bare board with only the × button
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    if (window.AtlasLoading) AtlasLoading.hide();
    if (bvGame && $('bv').classList.contains('on')) { stopSession(); openBoard(bvGame.id); }
  });
  // puzzles on the 3D table with the guide character (atlas/puzzles.js; chess, shogi — 2026-11-10)
  function startPuzzle() {
    if (renderPlace.close) renderPlace.close();
    if ($('bvPS')) $('bvPS').classList.remove('on');
    if (pend3d) { pend3d.then(() => startPuzzle()); return; }   // the board isn't on the table yet
    const g = bvGame; stopSession();
    $('bv').classList.add('playing', 'rules'); $('endc').classList.remove('on');
    session = AtlasPuzzles.start({ id: g.id, el: $('gl'), Table3D, lang, t, panel: $('bv'), adapter: Atlas3D[g.id], onExit: () => openBoard(g.id) });
    if (session.panel && window.ResizeObserver) new ResizeObserver(fitStage).observe(session.panel);
    fitStage(); Table3D.play(true);
  }
  // character-guided rules on the 3D table (atlas/rules/<id>.js)
  let rulesFromList = false;
  function startRules(fromList) {
    if (renderPlace.close) renderPlace.close();
    rulesFromList = fromList === true;
    if (pend3d) { pend3d.then(() => startRules(fromList)); return; }   // the board isn't on the table yet
    const g = bvGame; stopSession();
    $('bv').classList.add('playing', 'rules'); $('endc').classList.remove('on');
    session = AtlasRules[g.id].start({ el: $('gl'), Table3D, lang, panel: $('bv'),
      onStart: () => { stopSession(); startPlay(Atlas3D[g.id] && Atlas3D[g.id].table ? 'table' : undefined); },
      onExit: () => { if (rulesFromList) { rulesFromList = false; closeBoard(); } else openBoard(g.id); } });   // back: to the game list when started from there, else to the chabudai (settings card)
    if (session.panel && window.ResizeObserver) new ResizeObserver(fitStage).observe(session.panel);
    fitStage();
  }
  // phones turned sideways on the table of a game with the 2D landscape spec: offer the full game (once per game per visit)
  const LANDFULL = new Set(['backgammon', 'mancala', 'ur', 'senet', 'fanorona', 'alquerque']), landMQ = matchMedia('(orientation: landscape) and (pointer: coarse) and (max-height: 520px)');
  function landNudge() {
    const g = bvGame; if (!g || !LANDFULL.has(g.id) || !FULL_SKIN[g.id] || !landMQ.matches || !$('bv').classList.contains('on') || $('ov').classList.contains('on')) return;
    try { if (sessionStorage.getItem('atlas-landq-' + g.id)) return; sessionStorage.setItem('atlas-landq-' + g.id, '1'); } catch (e) {}
    openSheet(`<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${esc(t('bv.landQ'))}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn ghost" data-k>${esc(t('bv.landKeep'))}</button><button class="btn" data-f>${esc(t('bv.full'))} ▶</button></div>`);
    $('sheet').querySelector('[data-k]').onclick = closeSheet;
    $('sheet').querySelector('[data-f]').onclick = () => { closeSheet(); location.href = '../' + g.href + '?skin=atlas'; };
  }
  landMQ.addEventListener('change', () => setTimeout(landNudge, 400));
  function closeBoard() { if (renderPlace.close) renderPlace.close(); stopSession(); $('bv').classList.remove('on', 'playing'); document.body.style.overflow = ''; history.replaceState(null, '', '#' + page); render(page); }
  $('bvClose').onclick = closeBoard;
  window.AtlasBoard = { open: id => openBoard(id), close: closeBoard, ready: id => !window.AtlasLazy || AtlasLazy.loaded(id) };   // ヒストリア (opened from the game list) puts that game's board on the table first
  // the room's time of day (auto = by the clock)
  const TOD = { ja: ['自動', '朝', '昼', '夕方', '夜'], en: ['Auto', 'Morning', 'Day', 'Evening', 'Night'], zh: ['自动', '早晨', '白天', '傍晚', '夜晚'], ko: ['자동', '아침', '낮', '저녁', '밤'], es: ['Auto', 'Mañana', 'Día', 'Tarde', 'Noche'], fr: ['Auto', 'Matin', 'Jour', 'Soir', 'Nuit'], pt: ['Auto', 'Manhã', 'Dia', 'Tarde', 'Noite'], de: ['Auto', 'Morgen', 'Tag', 'Abend', 'Nacht'], hi: ['ऑटो', 'सुबह', 'दिन', 'शाम', 'रात'], ar: ['تلقائي', 'صباح', 'نهار', 'مساء', 'ليل'], ru: ['Авто', 'Утро', 'День', 'Вечер', 'Ночь'], 'zh-TW': ['自動', '早晨', '白天', '傍晚', '夜晚'], id: ['Otomatis', 'Pagi', 'Siang', 'Sore', 'Malam'], tr: ['Otomatik', 'Sabah', 'Gündüz', 'Akşam', 'Gece'] };
  function renderTod() {
    const btn = $('bvTodBtn'), menu = $('bvTodMenu'); if (!btn) return;
    const L = TOD[lang] || TOD.en, K = ['auto', 'morning', 'day', 'evening', 'night'], cur = (window.Table3D && Table3D.timeOfDayPick) ? Table3D.timeOfDayPick() : 'auto';
    const SW = { auto: 'conic-gradient(#ffd36b 0 25%,#ffe9a8 0 50%,#ff9d6b 0 75%,#3b4a8a 0)', morning: 'linear-gradient(#ffe7b0,#ffc9a0)', day: 'linear-gradient(#bfe6ff,#7fc8ff)', evening: 'linear-gradient(#ffb36b,#e0607a)', night: 'linear-gradient(#3b4a8a,#151a3a)' };
    $('bvTodLb').textContent = L[K.indexOf(cur)];
    menu.innerHTML = K.map((v, i) => `<button type="button" role="option" data-v="${v}" class="${v === cur ? 'on' : ''}" aria-selected="${v === cur}"><span class="sw" style="background:${SW[v]}"></span>${L[i]}</button>`).join('');
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = e => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); const pm = $('bvPlMenu'); if (open && pm && !pm.hidden) { if (renderPlace.close) renderPlace.close(); else pm.hidden = true; } };   // (closing the place panel through its own close() also slides the board back: hiding it alone left the camera aside)
    menu.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); close(); if (window.Table3D && Table3D.setTimeOfDay) Table3D.setTimeOfDay(b.dataset.v); renderTod(); });
    if (!renderTod.bound) { renderTod.bound = 1; document.addEventListener('click', () => { const m = $('bvTodMenu'); if (m && !m.hidden) { m.hidden = true; $('bvTodBtn').setAttribute('aria-expanded', 'false'); } }); document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = $('bvTodMenu'); if (m && !m.hidden) { m.hidden = true; $('bvTodBtn').setAttribute('aria-expanded', 'false'); } } }); }
  }
  renderTod();
  /* ---------- the place (table design) and 明るさ: the board view's chip + panel, and the きせかえ tab's テーブル ---------- */
  function placeHtml(big) {
    const X = P3(); if (!X) return '';
    const k = X.table(), b = X.bright(), names = X.PLACES.name[lang] || X.PLACES.name.en, B = X.placeUi('b', lang);
    return `<div class="plp${big ? ' big' : ''}"><div class="plh">${esc(X.placeUi('place', lang))}<small>${esc(names[k])}</small></div>
      <div class="plrow" role="group">${names.map((n, i) => `<button type="button" class="plcb" data-k="${i}" aria-pressed="${i === k}"><img src="${X.placeThumb(i)}" alt="" loading="lazy" width="160" height="107"><span>${esc(n)}</span></button>`).join('')}</div>
      ${boardRowHtml(big)}
      <div class="plh">${esc(X.placeUi('bright', lang))}</div>
      <div class="plbr" role="group">${B.map((n, i) => `<button type="button" data-b="${i}" aria-pressed="${i === b}"><i></i>${esc(n)}</button>`).join('')}</div>${big || k === 1 ? '' : todRowHtml()}</div>`;
  }
  // 時間帯 (the room's time of day): in the same panel as the place, under 明るさ (the board view's one chip opens both; 2D準拠 has none)
  const TODH = { ja: '時間帯', en: 'Time of day', zh: '时间段', 'zh-TW': '時段', ko: '시간대', es: 'Hora del día', fr: 'Moment de la journée', pt: 'Hora do dia', de: 'Tageszeit', hi: 'दिन का समय', ar: 'وقت اليوم', ru: 'Время суток', id: 'Waktu', tr: 'Günün saati' };
  const TODK = ['auto', 'morning', 'day', 'evening', 'night'], TODSW = { auto: 'conic-gradient(#ffd36b 0 25%,#ffe9a8 0 50%,#ff9d6b 0 75%,#3b4a8a 0)', morning: 'linear-gradient(#ffe7b0,#ffc9a0)', day: 'linear-gradient(#bfe6ff,#7fc8ff)', evening: 'linear-gradient(#ffb36b,#e0607a)', night: 'linear-gradient(#3b4a8a,#151a3a)' };
  function todRowHtml() {
    const L = TOD[lang] || TOD.en, cur = (window.Table3D && Table3D.timeOfDayPick) ? Table3D.timeOfDayPick() : 'auto';
    return `<div class="plh pltodh">${esc(TODH[lang] || TODH.en)}<small>${esc(L[TODK.indexOf(cur)])}</small></div>
      <div class="plbr pltod" role="group">${TODK.map((v, i) => `<button type="button" data-t="${v}" aria-pressed="${v === cur}"><i style="background:${TODSW[v]}"></i>${esc(L[i])}</button>`).join('')}</div>`;
  }
  // 盤: the game on the table has more than one 3D board (Table3D.BOARDS: chess, go, gomoku, backgammon, agon) → its boards
  // as a row of their own, under the places (the board view's panel only; the きせかえ tab has no game)
  function boardRowHtml(big) {
    const X = P3(), B = !big && bvGame && X && X.BOARDS && X.BOARDS[bvGame.id]; if (!B) return '';
    const k = B.get();
    return `<div class="plh">${esc(X.placeUi('board', lang))}<small>${esc(X.boardName(k, lang))}</small></div>
      <div class="plrow plbd" role="group">${B.list.map(v => `<button type="button" class="plcb" data-bd="${v}" aria-pressed="${v === k}"><img src="${X.boardThumb(bvGame.id, v)}" alt="" loading="lazy" width="160" height="107"><span>${esc(X.boardName(v, lang))}</span></button>`).join('')}</div>`;
  }
  // another 3D board: the shared key is written (the full game shows it too) and the board on the table is rebuilt at once
  function setBoard(v) {
    const X = P3(), g = bvGame; if (!X || !g || !X.BOARDS[g.id] || X.BOARDS[g.id].get() === v) return;
    X.setBoard(g.id, v);
    const m = $('bvPlMenu'); if (m && !m.hidden) placeInto(m);
    if (!glOK || !$('bv').classList.contains('on') || $('bv').classList.contains('playing')) return;
    const gl = $('gl'); clearTimeout(plFade); gl.style.transition = 'opacity .12s ease-out'; gl.style.opacity = '0';
    plFade = setTimeout(() => { try { Table3D.show(g.id, null, { still: true }); Table3D.play(false); } catch (e) { console.warn(e); } requestAnimationFrame(() => requestAnimationFrame(() => { gl.style.transition = 'opacity .24s ease-in'; gl.style.opacity = ''; })); }, 130);
  }
  // switching: a quick fade of the 3D room while it is rebuilt (no reload; the board on the table stays)
  let plFade = 0;
  function setPlace(k) {
    const X = P3(); if (!X || k === X.table()) return;
    const gl = $('gl'), vis = glOK && $('bv').classList.contains('on');
    if (!vis) { X.setTable(k); return; }
    clearTimeout(plFade); gl.style.transition = 'opacity .16s ease-out'; gl.style.opacity = '0';
    plFade = setTimeout(() => { try { X.setTable(k); } catch (e) { console.warn(e); } requestAnimationFrame(() => requestAnimationFrame(() => { gl.style.transition = 'opacity .28s ease-in'; gl.style.opacity = ''; })); }, 170);
  }
  // re-draws a place panel without losing where its rows were scrolled to (picking a place used to jump the row back to its start)
  function placeInto(root, big) {
    const rows = [...root.querySelectorAll('.plrow')].map(r => r.scrollLeft), top = root.scrollTop;
    root.innerHTML = placeHtml(big); bindPlace(root);
    root.querySelectorAll('.plrow').forEach((r, i) => { if (rows[i]) r.scrollLeft = rows[i]; }); if (top) root.scrollTop = top;
    if (!rows.length) revealSel(root);
  }
  // opening a panel brings the chosen place (and board) into view: the rows used to open at their start (2026-11-09)
  function revealSel(root) {
    if (!root || root.hidden || !root.offsetParent) return;
    root.querySelectorAll('.plrow').forEach((r, i) => { const b = r.querySelector('[aria-pressed="true"]'); if (!b) return; const rr = r.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (r.scrollWidth > r.clientWidth + 1) r.scrollLeft += (br.left + br.width / 2) - (rr.left + rr.width / 2);
      if (!i && root.scrollHeight > root.clientHeight + 1) { const qr = root.getBoundingClientRect(), b2 = b.getBoundingClientRect(); if (b2.top < qr.top || b2.bottom > qr.bottom) root.scrollTop += (b2.top + b2.height / 2) - (qr.top + qr.height / 2); } });
  }
  function bindPlace(root) {
    root.querySelectorAll('.plcb').forEach(b => b.onclick = e => { e.stopPropagation(); if (b.dataset.bd) setBoard(b.dataset.bd); else setPlace(+b.dataset.k); });
    root.querySelectorAll('.plbr button[data-b]').forEach(b => b.onclick = e => { e.stopPropagation(); P3().setBright(+b.dataset.b); });
    root.querySelectorAll('.plbr button[data-t]').forEach(b => b.onclick = e => { e.stopPropagation(); if (window.Table3D && Table3D.setTimeOfDay) Table3D.setTimeOfDay(b.dataset.t); renderTod(); const m = $('bvPlMenu'); if (m && !m.hidden) placeInto(m); });
  }
  // PC: while the panel is open the board slides aside (a shift lens, like ヒストリア), so the new place is seen at once
  let plShift = false;
  function aside(on) {
    if (!on && !plShift) return; plShift = on;
    if (!on && window.Historia && Historia.on) return;   // (ヒストリア has taken the lens over)
    if (!glOK || !window.Table3D || !Table3D.setShift || matchMedia('(max-width:760px)').matches) return;
    const w = on ? $('bvPlMenu').offsetWidth + 28 : 0, rtl = document.documentElement.dir === 'rtl'; Table3D.setShift(on ? (rtl ? w / 2 : -w / 2) : 0);
  }
  function renderPlace() {
    const X = P3(), btn = $('bvPlBtn'); if (!btn) return;
    if (!X) { btn.hidden = true; return; }
    const k = X.table(), names = X.PLACES.name[lang] || X.PLACES.name.en;
    $('bvPlIm').src = X.placeThumb(k); $('bvPlLb').textContent = names[k];
    btn.setAttribute('aria-label', X.placeUi('place', lang) + ': ' + names[k]);
    $('bvTodW').classList.toggle('notod', k === 1);   // the time of day: every place but 「2D準拠」 (which follows the 2D page)
    const m = $('bvPlMenu'); if (!m.hidden) placeInto(m);
    // 明るさ while playing at the table (the place panel is hidden then): 暗い · 標準 · 明るい at the top left
    { let pb = $('bvBrPlay'); if (!pb) { pb = document.createElement('div'); pb.id = 'bvBrPlay'; pb.className = 'bvbrp'; pb.setAttribute('role', 'group'); $('bv').appendChild(pb);
        pb.addEventListener('click', e => { const q = e.target.closest('[data-b]'); if (!q) return; e.stopPropagation(); P3().setBright(+q.dataset.b); }); }
      const B = X.placeUi('b', lang), b = X.bright();
      pb.setAttribute('aria-label', X.placeUi('bright', lang));
      pb.innerHTML = '<i aria-hidden="true"></i>' + B.map((n, i) => `<button type="button" data-b="${i}" aria-pressed="${i === b}">${esc(n)}</button>`).join(''); }
    btn.onclick = e => { e.stopPropagation(); const open = m.hidden; if (open) { m.innerHTML = placeHtml(); bindPlace(m); const tm = $('bvTodMenu'); if (tm) tm.hidden = true; } m.hidden = !open; btn.setAttribute('aria-expanded', String(open)); aside(open); if (open) revealSel(m); };
    if (!renderPlace.bound) { renderPlace.bound = 1;
      const close = () => { if (!m.hidden) { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); aside(false); } };
      renderPlace.close = close;
      m.addEventListener('click', e => e.stopPropagation());
      document.addEventListener('click', close); document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
      // a new place or brightness (here, the きせかえ tab, or a full game's デザイン tab in another tab of the browser): every label follows
      addEventListener('atlas-table', () => {
        renderPlace();
        const tb = $('bvTable'), b = tb && tb.querySelector('b'); if (b) b.textContent = placeT('play');
        const go = document.querySelector('#today [data-go]'); if (go) go.textContent = placeT('go') + ' ▶';
        if (page === 'dress' && dKind === 'table') renderDress();
        else if (!$('bv').classList.contains('on')) render(page);   // (the updates list names the place too; under the board view it is redrawn on close)
      });
      addEventListener('storage', e => { if (e.key === 'atlas-table' && P3()) P3().setTable(+e.newValue || 0); else if (e.key === 'atlas-bright2' && P3()) P3().setBright(+e.newValue); });
    }
  }
  renderPlace();
  $('bvQuit').onclick = () => { if (rulesFromList && $('bv').classList.contains('rules')) { rulesFromList = false; closeBoard(); } else openBoard(bvGame.id); };   // rules opened from the game list: back to the list
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('bv').classList.contains('on') && !$('ov').classList.contains('on')) closeBoard(); });
  // ‹ › / ← → / swipe: the previous / next game on the chabudai (same order as the game grid)
  function stepBoard(d) {
    const bv = $('bv'); if (!bv.classList.contains('on') || bv.classList.contains('playing') || bv.classList.contains('rules') || !bvGame) return;
    const list = A_.byUpdate(), i = list.findIndex(g => g.id === bvGame.id); if (i < 0) return;
    const g = list[(i + d + list.length) % list.length];
    openBoard(g.id, true);
  }
  $('bvPrev').onclick = () => stepBoard(-1); $('bvNext').onclick = () => stepBoard(1);
  document.addEventListener('keydown', e => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || $('ov').classList.contains('on')) return;
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    const rtl = document.documentElement.dir === 'rtl', d = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    if ($('bv').classList.contains('on') && !$('bv').classList.contains('playing')) { e.preventDefault(); stepBoard(d); }
  });
  (function swipe() {   // a quick horizontal flick with a finger (a slow drag still spins the board); a mouse drag never steps (PC, 2026-11-09)
    let s0 = null;
    $('bv').addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.target.closest('select,button,a,input')) return; s0 = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; }, true);
    $('bv').addEventListener('pointerup', e => {
      if (!s0 || e.pointerId !== s0.id) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y, dt = performance.now() - s0.t; s0 = null;
      if (dt < 650 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) { const rtl = document.documentElement.dir === 'rtl'; stepBoard((dx < 0) !== rtl ? 1 : -1); }
    }, true);
    $('bv').addEventListener('pointercancel', () => { s0 = null; }, true);
  })();

  let pfOpen = false;
  // the numbers the home profile card and My Page (きせかえ) share
  function profStats() {
    const touched = A_.GAMES.filter(g => P[g.id].touched).length, done = ACH.filter(a => a.done).length;
    const s = Math.max(1, W.login.streak || 1);
    return { touched, done, s, pos: ((s - 1) % 7) + 1, lv: 1 + Math.floor(done / 3) };
  }
  const pTile = (ic, v, of, lbl, cls = '') => `<div class="pt ${cls}"><span class="ic">${ic}</span><b>${v}${of != null ? `<small>/${of}</small>` : ''}</b><em>${esc(lbl)}</em></div>`;
  // the login week as a row of coin stamps
  const weekHtml = (head, pos) => `<div class="lgw"><div class="lgh"><b>${head}</b><small>${esc(t('login.week'))}</small></div>
      <div class="lgd">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="d ${d < pos ? 'got' : d === pos ? 'got now' : ''} ${d === 7 ? 'big' : ''}"><i>${d === 7 ? '🎁' : '¢'}</i><small>+${d === 7 ? 180 : 30}</small></span>`).join('')}</div></div>`;
  // the same name in every game (home card and My Page edit the same one)
  function setName(v) {
    W.name = v.trim(); A_.save(W); if (A_.shareName) A_.shareName(W.name, true);
    ['nameIn', 'dpName'].forEach(id => { const ni = $(id); if (ni && ni.value !== W.name) ni.value = W.name; });
    const mn = document.querySelector('#dmini .mnm'); if (mn) mn.textContent = W.name || t('pf.player');
  }
  function renderProfile() {
    const { touched, done, s, pos, lv } = profStats();
    // profile card: big avatar on its own backdrop · name · three stat tiles · the login week as a row of coin stamps
    $('prof').innerHTML = `<div class="pf-l"><div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div><button class="av${W.av.frame && W.av.frame !== 'f-none' ? ' framed' : ''}" id="avBtn" aria-label="${t('pf.edit')}">${ART.avatar(W.av, 104, { clear: true })}<span class="lv">Lv.${lv}</span></button></div>
      <div class="pf-r"><input id="nameIn" maxlength="16" value="${esc(W.name)}" placeholder="${esc(t('pf.name'))}" aria-label="${esc(t('pf.name'))}">
      <button type="button" class="pf-sum" id="pfMore" aria-expanded="${pfOpen}" aria-controls="pfDet" aria-label="${esc(t('pf.more'))}"><span class="pfc"><i>¢</i><span class="coinM">${C.balance.toLocaleString()}</span></span><span class="pfs">🔥${s}</span><svg class="pfv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="pf-det" id="pfDet"><div class="ptiles">${pTile('<i class="cn">¢</i>', `<span class="coinM">${C.balance.toLocaleString()}</span>`, null, t('pf.coins'), 'coin')}${pTile('🏆', done, ACH.length, t('pf.ach'))}${pTile('🎲', touched, A_.GAMES.length, t('pf.games'))}</div>
      ${weekHtml('🔥 ' + esc(t('login.day', { n: s })), pos)}
      <div class="accw"></div></div></div>`;
    $('prof').classList.toggle('open', pfOpen);
    { // wearing an SSR / UR (icon, background or frame): the home profile card gets the same running light, glow and twinkle as the dress-up name card (2026-11-10)
      const el = $('prof'), top = Math.max(-1, ...['icon', 'bg', 'frame'].map(k => { const it = ART.byId(W.av[k]); return it ? it.rar : -1; }));
      el.classList.toggle('nr3', top === 3); el.classList.toggle('nr4', top === 4);
      el.querySelectorAll(':scope > .rfx, :scope > .ntw').forEach(x => x.remove());
      if (top >= 3) el.insertAdjacentHTML('beforeend', `<i class="rfx ${top === 4 ? 'u' : 's'}"></i><i class="ntw"></i>`); }
    $('pfMore').onclick = () => { pfOpen = !pfOpen; $('prof').classList.toggle('open', pfOpen); $('pfMore').setAttribute('aria-expanded', pfOpen); };   // phones: the one-line profile opens its stats · login week · Google sign-in
    $('avBtn').onclick = () => go('dress');
    renderAcc();
    $('nameIn').onchange = e => setName(e.target.value);
  }
  /* ---------- GAMES ---------- */
  function renderGames() {
    $('hAll').textContent = t('games.h');
    renderFilter({ chips: 'catChips2', q: 'gSearch2', ic: 'gSearchIc2' }, renderGamesList);
    renderGamesList();
  }
  function renderGamesList() {
    const list = visibleGames();
    // screenshot cards grouped by category (atlas/gamelist.js); the long description is in the board sheet a tap opens
    AtlasGameList.render($('allGames'), list, { t, esc, gname, about: g => t('about.' + g.id), tl: g => t('tl.' + g.id),
      hasRules: () => true,
      // the 3D rules tour on the table where the game has one; otherwise the 2D game opens straight on its own rules (shared/rulelink.js)
      onRules: id => { if ((window.AtlasRules && AtlasRules[id]) || (window.AtlasLazy && AtlasLazy.hasRules(id))) { openBoard(id).then(() => { if (glOK && window.AtlasRules && AtlasRules[id]) startRules(true); }); return; } const g = A_.GAMES.find(x => x.id === id); if (g) location.href = '../' + g.href + '?rules=1'; }, onHistoria: id => Historia.open(id), art: g => artImg(g), badge: g => A_.badges(g).slice(0, 1).map(badgeHtml).join(''),
      pct: g => P[g.id].pct, tags: A_.TAGS, cats: A_.CATS });
    $('gNone2').hidden = !!list.length; $('gNone2').textContent = t('search.none');
    $('allGames').querySelectorAll('[data-open]').forEach(a => a.onclick = e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openBoard(a.dataset.open); });
  }

  /* ---------- ACHIEVEMENTS ---------- */
  /* horizontal chip rows: translucent ‹ › buttons for people without a trackpad / shift-wheel */
  function hscroll(w) {
    if (!w) return; const row = w.querySelector('.chips'), [l, r] = w.querySelectorAll('.hsn');
    const rtl = getComputedStyle(row).direction === 'rtl';
    const upd = () => { const x = Math.abs(row.scrollLeft), m = row.scrollWidth - row.clientWidth - 2;
      (rtl ? r : l).classList.toggle('on', x > 2); (rtl ? l : r).classList.toggle('on', x < m); };
    if (!w._hs) {
      w._hs = 1;
      const go = d => row.scrollBy({ left: d * Math.max(160, row.clientWidth * .7), behavior: 'smooth' });
      l.onclick = () => go(-1); r.onclick = () => go(1);
      row.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd);
    }
    requestAnimationFrame(upd);
  }
  /* every other row that scrolls sideways (the place / board pickers on phones, the category chips): a translucent ‹ › guide on the side
     that has more, and a soft fade there. Rows are found as they appear (pickers are rebuilt each time they open). Not for rows that
     already have their own buttons (.hsc, the updates row). */
  const SG_SEL = '.plrow, .chips';
  function scrollGuide(row) {
    if (row._sg || row.closest('.hsc') || !row.parentNode) return; row._sg = 1;
    // (moving a node resets its scroll: keep where the row was — a picker rebuilt on each choice restores its rows' scroll just before this runs)
    const x0 = row.scrollLeft, w = document.createElement('div'); w.className = 'sgw'; row.parentNode.insertBefore(w, row); w.appendChild(row);
    if (x0) { row.scrollLeft = x0; requestAnimationFrame(() => { if (Math.abs(row.scrollLeft - x0) > 1) row.scrollLeft = x0; }); }
    const mk = (side, d) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sgn ' + side; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true');
      b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${side === 'l' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}"/></svg>`;
      b.onclick = e => { e.stopPropagation(); row.scrollBy({ left: d * Math.max(140, row.clientWidth * .7), behavior: 'smooth' }); }; w.appendChild(b); return b; };
    const L = mk('l', -1), Rb = mk('r', 1);
    const upd = () => { const rtl = getComputedStyle(row).direction === 'rtl', x = Math.abs(row.scrollLeft), m = row.scrollWidth - row.clientWidth;
      const scr = m > 8 && getComputedStyle(row).overflowX !== 'visible', a = scr && x > 8, b = scr && x < m - 8;   // (8: snap padding is not 'more')   // a: hidden at the start, b: at the end
      const left = rtl ? b : a, right = rtl ? a : b;
      L.classList.toggle('on', left); Rb.classList.toggle('on', right); row.classList.toggle('sgL', left); row.classList.toggle('sgR', right); };
    row.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd);
    try { new ResizeObserver(upd).observe(row); } catch (e) {}
    try { new MutationObserver(() => requestAnimationFrame(upd)).observe(row, { childList: true }); } catch (e) {}
    requestAnimationFrame(upd); setTimeout(upd, 400);
  }
  const sgScan = root => { if (root.matches && root.matches(SG_SEL)) scrollGuide(root); if (root.querySelectorAll) root.querySelectorAll(SG_SEL).forEach(scrollGuide); };
  sgScan(document.body);
  try { new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && !n.classList.contains('sgw')) sgScan(n); }))).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  let achF = 'all', achS = 'all';   // achS: done / to-do filter (phones and PC)
  function renderAch() {
    $('hAch').textContent = t('ach.h');
    const done = ACH.filter(a => a.done).length, coins = ACH.filter(a => a.done).reduce((s, a) => s + A_.TIER_COINS[a.tier], 0);
    $('achSum').innerHTML = `<span class="coin"><i>¢</i>${coins.toLocaleString()}</span><b style="font-family:var(--round);font-size:18px">${done} / ${ACH.length}</b>
      <span class="bar" style="flex:1;min-width:120px;--c:var(--mint)"><i style="width:${done / ACH.length * 100}%"></i></span>
      <div class="aseg" role="group">${['all', 'done', 'todo'].map(k => `<button type="button" aria-pressed="${achS === k}" data-s="${k}">${t('ach.' + k)}</button>`).join('')}</div>`;
    $('achSum').querySelectorAll('.aseg button').forEach(b => b.onclick = () => { achS = b.dataset.s; renderAch(); });
    const groups = [['all', t('ach.all'), null], ['common', t('ach.common'), null], ...A_.GAMES.map(g => [g.id, gname(g), g])];
    $('achChips').innerHTML = groups.map(([k, l, g]) => {
      const list = k === 'all' ? ACH : ACH.filter(a => (a.gid || 'common') === k);
      return `<button class="chip" aria-pressed="${achF === k}" data-k="${k}">${g ? `<img src="${artSrc(g)}" alt="" style="object-fit:contain;background:none">` : ''}${esc(l)} <em>${list.filter(a => a.done).length}/${list.length}</em></button>`;
    }).join('');
    $('achChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { achF = b.dataset.k; renderAch(); });
    hscroll($('achHsc'));
    const list = (achF === 'all' ? ACH : ACH.filter(a => (a.gid || 'common') === achF)).slice()
      .filter(a => achS === 'all' || (achS === 'done') === !!a.done)
      .sort((a, b) => (b.done - a.done) || (a.done ? 0 : (b.have / b.need) - (a.have / a.need)));
    $('achList').innerHTML = list.map(achHtml).join('');
  }

  /* ---------- SHOP ---------- */
  // phones get their own shop / gacha / achievements layout (CSS under max-width:760px); PC keeps the plain one
  const isPhone = () => matchMedia('(max-width:760px)').matches;
  { const mq = matchMedia('(max-width:760px)'), re = () => { if (page === 'gacha') { if (!busy) renderGacha(); renderShop(); } else if (page === 'ach') renderAch(); };
    mq.addEventListener ? mq.addEventListener('change', re) : mq.addListener(re); }
  const wearing = id => { const it = ART.byId(id); return !!it && W.av[it.kind] === id; };
  function wear(id) { const it = ART.byId(id); if (!it || !W.owned.includes(id)) return; W.av[it.kind] = id; A_.save(W); SFX.boing && SFX.boing(); }
  function renderShop() {
    $('hShop').textContent = t('shop.h'); $('shopNote').textContent = t('shop.note'); $('how1').textContent = t('how');
    const ph = isPhone();
    $('shopItems').innerHTML = A_.shop(W).map(({ id, price }) => {
      const it = ART.byId(id), own = W.owned.includes(id), on = own && wearing(id);
      // phone: owned items can be worn right here (and show when they are worn)
      const foot = own ? (ph ? (on ? `<span class="btn sm ghost won" aria-disabled="true">✓ ${t('dress.on')}</span>` : `<button class="btn sm sky" data-eq="${id}">${t('dress.wear')}</button>`)
        : `<span class="btn sm ghost" aria-disabled="true">${t('shop.owned')}</span>`)
        : `<button class="btn sm sun" data-buy="${id}" data-p="${price}" ${C.balance < price ? 'disabled' : ''}><span class="price"><i></i>${price}</span></button>`;
      return itemCard(it, foot, ph ? (own ? 'own' : '') + (on ? ' on' : '') : '');
    }).join('');
    const buyNow = (id, p, quiet) => {
      if (C.balance < p) return toast(t('shop.short'));
      if (A_.buy(W, id, p)) { refresh(); bumpCoins(); if (!quiet) toast(t('shop.bought', { name: iname(ART.byId(id)) })); confetti(60); renderShop(); if (page === 'gacha' && !busy) renderGacha(); return true; }
    };
    $('shopItems').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const id = b.dataset.buy, p = +b.dataset.p;
      if (isPhone()) return shopSheet(id, p, buyNow);
      buyNow(id, p);
    });
    $('shopItems').querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { wear(b.dataset.eq); renderShop(); });
    // phone: tapping the picture of an unbought item opens the same purchase sheet
    if (ph) $('shopItems').querySelectorAll('.item').forEach(c => { const b = c.querySelector('[data-buy]'); if (b) c.querySelector('.art').onclick = () => b.click(); });
  }
  // phone purchase confirm: a bottom sheet with the item, its price and the balance after; once bought it offers to wear it
  function shopSheet(id, p, buyNow) {
    const it = ART.byId(id);
    const body = bought => `<div class="bgrab" aria-hidden="true"></div><div class="bsi"><div class="card item r${it.rar}" data-kind="${it.kind}"><span class="rar">${ART.RAR[it.rar]}</span><div class="art">${ART.svg(it.id)}</div></div>
      <div class="bst"><b>${esc(iname(it))}</b><span class="gnote">${t('kind.' + it.kind)}</span>
      ${bought ? `<span class="bsok">${esc(t('shop.bought', { name: iname(it) }))}</span>` : `<span class="bsp"><span class="price"><i></i>${p.toLocaleString()}</span><small>→ <span class="price"><i></i>${(C.balance - p).toLocaleString()}</span></small></span>`}</div></div>
      <div class="bsb">${bought ? (wearing(id) ? `<span class="btn ghost" aria-disabled="true">✓ ${t('dress.on')}</span>` : `<button class="btn sky" data-eq="${id}">${t('dress.wear')}</button>`)
        : `<button class="btn sun" data-cbuy="${id}" ${C.balance < p ? 'disabled' : ''}>${t('shop.buy')} <span class="price"><i></i>${p.toLocaleString()}</span></button>`}<button class="btn ghost" data-x>${t('g.close')}</button></div>`;
    const wire = () => { const sh = $('sheet');
      sh.querySelector('[data-x]').onclick = closeSheet;
      const cb = sh.querySelector('[data-cbuy]'); if (cb) cb.onclick = () => { if (buyNow(id, p, true)) { sh.innerHTML = body(true); wire(); } };
      const eb = sh.querySelector('[data-eq]'); if (eb) eb.onclick = () => { wear(id); renderShop(); sh.innerHTML = body(true); wire(); }; };
    openSheet(body(false), 'bsh'); wire();
  }

  /* ---------- GACHA ---------- */
  const MACHINE = `<svg viewBox="0 0 320 400" aria-hidden="true">
    <ellipse cx="160" cy="388" rx="120" ry="10" fill="#000" opacity=".12"/>
    <path d="M60 230h200l18 150H42z" fill="#ff5d5d"/><path d="M60 230h200l4 30H56z" fill="#d93c3c"/>
    <rect x="118" y="318" width="84" height="48" rx="14" fill="#2b3044"/><rect x="128" y="326" width="64" height="32" rx="10" fill="#1a1e2c"/>
    <circle cx="160" cy="132" r="112" fill="#e9f7ff" stroke="#fff" stroke-width="8"/>
    <g id="caps">${[[110, 160, '#ffc928'], [160, 180, '#36b4ff'], [210, 165, '#ff7fbe'], [130, 205, '#3ccf91'], [190, 210, '#8d6bff'], [90, 205, '#ff5d5d'], [232, 205, '#ffc928'], [160, 225, '#ff7fbe'], [120, 120, '#36b4ff'], [200, 118, '#3ccf91'], [160, 140, '#ffb21e']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><circle r="22" fill="#fff"/><path d="M-22 0a22 22 0 0 0 44 0z" fill="${c}"/><circle r="22" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/></g>`).join('')}</g>
    <ellipse cx="118" cy="70" rx="34" ry="16" fill="#fff" opacity=".7" transform="rotate(-30 118 70)"/>
    <rect x="96" y="232" width="128" height="40" rx="20" fill="#fff6e2"/><text x="160" y="259" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="#d93c3c">ATLAS</text>
    <g id="knob"><circle cx="160" cy="300" r="26" fill="#ffc928" stroke="#e09a00" stroke-width="4"/><rect x="152" y="280" width="16" height="40" rx="8" fill="#fff6e2"/></g>
  </svg>`;
  // the 3D capsule machine (gacha3d.js); the flat SVG above is only the fallback without WebGL
  let G3 = null;
  function gacha3() {
    if (G3 || !window.Gacha3D) return G3;
    try { $('machine').innerHTML = ''; $('machine').classList.add('m3'); G3 = Gacha3D.mount($('machine'), { sfx: SFX }); } catch (e) { G3 = null; $('machine').classList.remove('m3'); }
    return G3;
  }
  function renderGacha() {
    dsegPos();   // --tabsH: the phone layout sizes the machine to end right above the pull buttons + tab bar
    if (!gacha3()) $('machine').innerHTML = MACHINE;
    const R = A_.GACHA, own = W.owned.length, all = ART.items.length, pct = Math.round(own / all * 100);
    const capIco = '<svg class="gico" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="#fff"/><path d="M3 16a13 13 0 0 0 26 0z" fill="#ff6b6b"/><path d="M3 16h26" stroke="#d93c3c" stroke-width="2.4"/><ellipse cx="11" cy="9.5" rx="4" ry="2.2" fill="#fff" opacity=".9" transform="rotate(-25 11 9.5)"/><circle cx="16" cy="16" r="13" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1.5"/></svg>';
    const pb = (id, cls, label, cost, badge) => { const short = C.balance < cost;
      return `<button class="btn gbig ${cls}${short ? ' short' : ''}" id="${id}" ${short || busy ? 'disabled' : ''}>${badge ? `<em class="gbadge">${t('g.badge')}</em>` : ''}<span class="gl">${t(label)}</span><span class="price"><i></i>${cost.toLocaleString()}</span>${short ? `<span class="gneed">${t('g.need', { n: (cost - C.balance).toLocaleString() })}</span>` : ''}</button>`; };
    $('gpanel').innerHTML = `<div class="ghead">${capIco}<h3>${t('g.h')}</h3></div>
      <div class="gwallet"><span>${t('g.have')}</span><b class="price"><i></i><span class="coinM">${C.balance.toLocaleString()}</span></b></div>
      <div class="gbtns">${pb('g1', 'sky', 'g.one', R.one)}${pb('g10', '', 'g.ten', R.ten, true)}</div>
      <div class="gsec"><div class="gst">${t('g.rates')}</div><div class="rates">${R.rates.map((p, i) => `<span class="r${i}"><i></i><b>${ART.RAR[i]}</b>${(p * 100).toFixed(1)}%</span>`).join('')}</div></div>
      <div class="gsec"><div class="gst">${t('g.coll')}<span class="gcnt">${own} / ${all}</span></div><div class="gbar"><i style="width:${Math.max(2, pct)}%"></i></div>
        <button type="button" class="glink" id="gDress">${t('g.toDress')} <span aria-hidden="true">›</span></button></div>
      <p class="gfoot">★ ${t('g.dup')}</p>
      <div class="gmini"><span class="coin"><i>¢</i><span class="coinM">${C.balance.toLocaleString()}</span></span><button type="button" class="gml" id="gmInfo">${t('g.rates')} <span aria-hidden="true">›</span></button><button type="button" class="gml" id="gmColl">${t('g.coll')} <b>${own}/${all}</b> <span aria-hidden="true">›</span></button></div>`;
    $('gDress').onclick = () => go('dress');
    // phone: the rates + collection live in a bottom sheet behind the two small links (the panel shows only the coins and the pull buttons)
    const info = () => { openSheet(`<div class="bgrab" aria-hidden="true"></div><h3>${t('g.h')}</h3>${[...$('gpanel').querySelectorAll('.gsec,.gfoot')].map(e => e.outerHTML).join('').replace('id="gDress"', 'id="gDressS"')}<div class="bsb"><button class="btn ghost" data-x>${t('g.close')}</button></div>`, 'bsh ginfo');
      $('sheet').querySelector('[data-x]').onclick = closeSheet; $('sheet').querySelector('#gDressS').onclick = () => { closeSheet(); go('dress'); }; };
    $('gmInfo').onclick = info; $('gmColl').onclick = info;
    $('g1').onclick = () => doPull(1); $('g10').onclick = () => doPull(10);
  }
  let busy = false;
  const capHtml = (r, i) => { const it = ART.byId(r.id);
    return `<button class="cap c${r.rar}" data-i="${i}" aria-label="${t('g.tap')}"><span class="in"><span class="f"></span><span class="b">${r.dup ? `<span class="dp">¢${t('g.refund', { n: r.refund })}</span>` : `<span class="nw">${t('g.new')}</span>`}${ART.svg(r.id, 80)}<span class="rr">${ART.RAR[r.rar]}</span><span class="n">${esc(iname(it))}</span></span></span></button>`; };
  function resultSheet(res, n, cost, opened, onClose) {
    openSheet(`<h3>${t('g.h')}</h3><div class="res ${n === 1 ? 'one' : ''}">${res.map(capHtml).join('')}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn ghost" id="gClose">${t('g.close')}</button><button class="btn sky" id="gAgain" ${C.balance < cost ? 'disabled' : ''}>${t('g.again')}</button></div>`, opened ? 'gres' : '', onClose);
    const caps = [...document.querySelectorAll('.cap')];
    const openCap = c => { if (c.classList.contains('open')) return; c.classList.add('open'); const r = res[+c.dataset.i]; if (r.rar >= 3) confetti(r.rar === 4 ? 160 : 70); };
    if (opened) { caps.forEach((c, i) => { c.classList.add('open'); c.style.animationDelay = i * 40 + 'ms'; }); const top = Math.max(...res.map(r => r.rar)); if (top >= 3) confetti(top === 4 ? 160 : 90); }   // the machine already played the pop + shimmer
    else { caps.forEach(c => c.onclick = () => openCap(c)); caps.forEach((c, i) => setTimeout(() => openCap(c), 350 + i * 170)); }
    $('gClose').onclick = closeSheet;
    $('gAgain').onclick = () => { closeSheet(); doPull(n); };
  }
  async function doPull(n) {
    const cost = n === 10 ? A_.GACHA.ten : A_.GACHA.one;
    if (busy || C.balance < cost) return toast(t('shop.short'));
    busy = true;
    const res = A_.pull(W, n); refresh(); bumpCoins();
    const g = gacha3();
    renderGacha();
    if (!g) {   // fallback: shake the flat machine, then the flip cards
      const m = $('machine'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
      const k = $('knob'); if (k) k.style.transform = 'rotate(360deg)';
      setTimeout(() => { busy = false; resultSheet(res, n, cost, false); renderGacha(); }, 700);
      return;
    }
    const mr = $('machine').getBoundingClientRect();
    if (mr.top < 60 || mr.bottom > innerHeight) $('machine').scrollIntoView({ behavior: 'smooth', block: 'center' });
    const info = r => { const it = ART.byId(r.id);
      return { art: ART.svg(r.id, 160), rar: ART.RAR[r.rar], name: esc(iname(it)), tag: r.dup ? '¢' + t('g.refund', { n: r.refund }) : t('g.new') }; };
    let done = false;
    try { done = await g.play(res, { info, skip: t('g.skip'), onOpen: r => { if (r.rar >= 3) confetti(r.rar === 4 ? 160 : 70); } }); }
    catch (e) { console.error(e); done = true; }
    busy = false; renderGacha(); renderShop();
    if (!done) return;
    if (n === 1) {
      const a = g.actions(`<button class="btn ghost" id="gClose1">${t('g.close')}</button><button class="btn sky" id="gAgain1" ${C.balance < cost ? 'disabled' : ''}>${t('g.again')}</button>`);
      a.querySelector('#gClose1').onclick = () => g.reset();
      a.querySelector('#gAgain1').onclick = () => doPull(1);
    } else if (page === 'gacha') resultSheet(res, n, cost, true, () => g.reset());
    else g.reset();
  }

  /* ---------- DRESS ---------- */
  let dKind = 'icon', dSort = (() => { try { return localStorage.getItem('atlas-dsort') || 'own'; } catch (e) { return 'own'; } })();
  let dRar = (() => { try { const v = localStorage.getItem('atlas-drar'); return v == null ? -1 : +v; } catch (e) { return -1; } })();   // −1 = every rarity
  // the dress-up character as an HTML image over the SVG frame: CSS animations on SVG <image> don't run on iOS Safari.
  // The wrapper keeps the same clip as the SVG's pop clip (the frame's circle + everything above its middle).
  function popChar(av, S) {
    const it = ART.byId(av.icon) || ART.byId(ART.DEFAULT_ICON); if (!it) return '';
    const k = S / 100, f = v => (v * k).toFixed(1);
    const clip = `M${f(-46)} ${f(-89)}H${f(134)}V${f(41)}H${f(85)}A${f(41)} ${f(41)} 0 0 1 ${f(3)} ${f(41)}H${f(-46)}Z`;
    return `<span class="av-cw" style="position:absolute;left:${f(6)}px;top:${f(9)}px;width:${f(88)}px;height:${f(88)}px;clip-path:path('${clip}');-webkit-clip-path:path('${clip}');pointer-events:none"><img class="av-ch" src="${ART.avUrl(it.id)}" alt="" draggable="false" style="display:block;width:100%;height:100%"></span>`;
  }
  // the player card (きせかえ's preview, doubling as My Page): the dressed-up character on its background · name · Lv · coins ·
  // stat tiles (実績 → the achievements tab, games played, login streak, collection) · what is worn · the login week · Google.
  // PC: a tall narrow column sticky beside the items (character + worn items · name/coins/Lv · 2×2 tiles · login week · Google);
  // phones: a compact block
  // (the worn items beside the character; the login week and Google open from the 🔥 tile)
  let ncWk = false;
  function renderCard() {
    const el = $('dprev'), phone = matchMedia('(max-width:760px)').matches, PS = phone ? 92 : 128;
    const { touched, done, s, pos, lv } = profStats(), got = done % 3, nx = esc(t('mp.next', { n: 3 - got }));
    const worn = ['icon', 'bg', 'frame'].map(k => { const it = ART.byId(W.av[k]) || (k === 'icon' ? ART.byId(ART.DEFAULT_ICON) : null);
      return `<div class="dw${k === dKind ? ' on' : ''}"><div class="dwh"><span class="dwk">${t('kind.' + k)}</span>${it ? `<span class="rar r${it.rar}">${ART.RAR[it.rar]}</span>` : ''}</div><b>${it ? esc(iname(it)) : '—'}</b></div>`; }).join('');
    const tile = (ic, v, lbl, attr = '', end = '') => `<${attr ? 'button type="button"' : 'div'} class="nct"${attr}><span class="ic">${ic}</span><b>${v}</b><em>${esc(lbl)}</em>${end}</${attr ? 'button' : 'div'}>`;
    el.classList.toggle('dark', ART.isDark(W.av.bg));
    el.classList.toggle('wk', ncWk);
    el.innerHTML = `<div class="nc-l"><div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div>
        <button class="av poke" aria-label="${esc(iname(ART.byId(W.av.icon) || ART.byId(ART.DEFAULT_ICON)))}" style="background:none;box-shadow:none">${ART.avatar(W.av, PS, { pop: true, clear: true, noChar: true })}${popChar(W.av, PS)}</button>
        ${phone ? '' : `<div class="dname">${worn}</div>`}</div>
      <div class="nc-side"><div class="nc-top"><input id="dpName" maxlength="16" value="${esc(W.name)}" placeholder="${esc(t('pf.name'))}" aria-label="${esc(t('pf.name'))}"><span class="coin nc-coin"><i>¢</i><span class="coinM">${C.balance.toLocaleString()}</span></span></div>
        <div class="nc-lv"><b>Lv.${lv}</b><span class="nc-lvb" role="img" aria-label="${nx}">${[0, 1, 2].map(i => `<i class="${i < got ? 'on' : ''}"></i>`).join('')}</span><small>${nx}</small></div>
        ${phone ? `<div class="dname">${worn}</div>` : ''}</div>
      <div class="nc-tiles">${tile('🏆', `${done}<small>/${ACH.length}</small>`, t('pf.ach'), ' data-go="ach"', '<span class="nc-ar" aria-hidden="true">›</span>')}${tile('🎲', `${touched}<small>/${A_.GAMES.length}</small>`, t('pf.games'))}${tile('🔥', `${s}<small> ${esc(t('mp.d'))}</small>`, t('mp.streak'), ` data-wk aria-expanded="${ncWk}" aria-controls="ncWk"`, '<svg class="nc-v" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>')}${tile('🎀', `${W.owned.length}<small>/${ART.items.length}</small>`, t('g.coll'))}</div>
      <div class="nc-wk" id="ncWk">${weekHtml(esc(t('login.h')), pos)}<div class="accw"></div></div>`;
    el.querySelector('.poke').onclick = () => pokeAvatar();
    el.querySelector('[data-go=ach]').onclick = () => go('ach');
    el.querySelector('[data-wk]').onclick = e => { ncWk = !ncWk; el.classList.toggle('wk', ncWk); e.currentTarget.setAttribute('aria-expanded', ncWk); };
    $('dpName').onchange = e => setName(e.target.value);
    // wearing an SSR / UR (icon, background or frame): the name card gets the same running light and glow
    const top = Math.max(-1, ...['icon', 'bg', 'frame'].map(k => { const it = ART.byId(W.av[k]); return it ? it.rar : -1; }));
    el.classList.toggle('nr3', top === 3); el.classList.toggle('nr4', top === 4);
    if (top >= 3) el.insertAdjacentHTML('beforeend', `<i class="rfx ${top === 4 ? 'u' : 's'}"></i><i class="ntw"></i>`);
    renderAcc();
    renderMini();
  }
  // phones: once the name card has scrolled away, a mini card (character on its background + frame · name · what is worn)
  // stays pinned under the header, with the sort chips under it, so every change of clothes stays in sight
  function renderMini() {
    const el = $('dmini'); if (!el) return;
    const worn = ['icon', 'bg', 'frame'].map(k => { const it = ART.byId(W.av[k]) || (k === 'icon' ? ART.byId(ART.DEFAULT_ICON) : null);
      return `<span class="mw${k === dKind ? ' on' : ''}"><i>${t('kind.' + k)}</i>${it ? `<span class="rar r${it.rar}">${ART.RAR[it.rar]}</span>` : ''}<b>${it ? esc(iname(it)) : '—'}</b></span>`; }).join('');
    el.innerHTML = `<span class="mav"><span class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></span>${ART.avatar(W.av, 54, { clear: true })}</span>
      <span class="mtx"><b class="mnm">${esc(W.name || t('pf.player'))}</b>${worn}</span>`;
    miniPos();
  }
  function miniPos() {
    const el = $('dmini'); if (!el) return;
    const on = page === 'dress' && matchMedia('(max-width:760px)').matches && (() => {
      const hd = document.querySelector('header'), c = $('dprev').getBoundingClientRect();
      return c.height > 0 && c.bottom < (hd ? hd.offsetHeight : 62) + el.offsetHeight + 30; })();
    if (el.classList.contains('on') !== on) { el.classList.toggle('on', on); el.setAttribute('aria-hidden', !on); }
  }
  if ($('dmini')) $('dmini').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  addEventListener('scroll', miniPos, { passive: true });
  addEventListener('resize', miniPos);
  matchMedia('(max-width:760px)').addEventListener('change', () => { if (page === 'dress') renderCard(); });   // the character's size follows the layout
  function renderDress() {
    $('hDress').textContent = t('dress.h');
    renderCard();
    const kinds = ['icon', 'bg', 'frame'].concat(P3() ? ['table'] : []);
    $('dseg').innerHTML = kinds.map(k => `<button aria-pressed="${dKind === k}" data-k="${k}">${k === 'table' ? esc(P3().placeUi('table', lang)) : t('kind.' + k)}</button>`).join('');
    $('dseg').querySelectorAll('button').forEach(b => b.onclick = () => { dKind = b.dataset.k; renderDress(); });
    dsegPos();
    $('dsort').parentNode.style.display = dKind === 'table' ? 'none' : '';
    if (dKind === 'table') { $('dItems').classList.remove('grouped'); placeInto($('dItems'), true); return; }
    const slot = dKind;
    // 'own': only the owned items (by rarity) · 'rarD' / 'rarA': every item in sections by rarity (owned first in each section)
    $('dsort').innerHTML = ['own', 'rarD', 'rarA'].map(k => `<button type="button" aria-pressed="${dSort === k}" data-s="${k}">${t('dress.sort.' + k)}</button>`).join('');
    $('dsort').querySelectorAll('button').forEach(b => b.onclick = () => { dSort = b.dataset.s; try { localStorage.setItem('atlas-dsort', dSort); } catch (e) {} renderDress(); });
    const ownd = it => W.owned.includes(it.id) ? 1 : 0, idx = new Map(ART.items.map((it, i) => [it.id, i]));
    const all = ART.items.filter(it => it.kind === dKind);
    // the rarity pulldown (left of the sort): only one rarity, or every one
    const rars = [...new Set(all.map(it => it.rar))].sort((a, b) => a - b); if (dRar >= 0 && !rars.includes(dRar)) dRar = -1;
    const rName = r => r < 0 ? esc(t('dress.rar.all')) : ART.RAR[r], btn = $('drar'), pop = $('drarPop');
    btn.setAttribute('aria-label', t('dress.rar.h')); btn.title = t('dress.rar.h');
    btn.innerHTML = rName(dRar); btn.className = dRar < 0 ? '' : 'r' + dRar;
    const openRar = on => { pop.hidden = !on; btn.setAttribute('aria-expanded', on);
      if (on) { pop.innerHTML = [-1].concat(rars).map(r => `<button type="button" role="option" data-r="${r}" aria-selected="${dRar === r}"><i>${dRar === r ? '✓' : ''}</i><b class="${r < 0 ? 'all' : 'r' + r}">${rName(r)}</b></button>`).join('');
        pop.querySelectorAll('[data-r]').forEach(b => b.onclick = e => { e.stopPropagation(); openRar(false); const v = +b.dataset.r; if (v !== dRar) { dRar = v; try { localStorage.setItem('atlas-drar', dRar); } catch (x) {} renderDress(); } }); } };
    btn.onclick = e => { e.stopPropagation(); openRar(pop.hidden); };
    if (!renderDress.rarDoc) { renderDress.rarDoc = 1;   // close on a tap elsewhere / Esc
      document.addEventListener('click', e => { const p = $('drarPop'); if (p && !p.hidden && !p.contains(e.target)) { p.hidden = true; $('drar').setAttribute('aria-expanded', false); } });
      document.addEventListener('keydown', e => { const p = $('drarPop'); if (e.key === 'Escape' && p && !p.hidden) { p.hidden = true; $('drar').setAttribute('aria-expanded', false); } }); }
    openRar(false);
    const list = (dSort === 'own' ? all.filter(ownd) : all).filter(it => dRar < 0 || it.rar === dRar).sort((a, b) => (dSort === 'rarD' ? b.rar - a.rar : a.rar - b.rar) || (ownd(b) - ownd(a)) || idx.get(a.id) - idx.get(b.id));
    const sec = r => { const of = all.filter(it => it.rar === r); return `<div class="dsec r${r}"><span class="rar r${r}">${ART.RAR[r]}</span><span class="dsn">${of.filter(ownd).length} / ${of.length}</span></div>`; };
    const cell = it => { const own = W.owned.includes(it.id), on = W.av[slot] === it.id;
      return `<button type="button" class="dic r${it.rar}${own ? '' : ' locked'}${on ? ' sel' : ''}" data-kind="${it.kind}" data-id="${it.id}" title="${esc(iname(it))}" aria-label="${esc(iname(it))} (${ART.RAR[it.rar]})" aria-pressed="${on}">${own && it.rar >= 3 ? `<i class="rfx ${it.rar === 4 ? 'u' : 's'}"></i>` : ''}<span class="art">${ART.svg(it.id)}</span><span class="rl">${ART.RAR[it.rar]}</span>${own ? '' : '<span class="lk" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg></span>'}</button>`; };
    // rarity sorts: one rounded box per rarity, tinted in its colour, its heading (badge · owned / all) on the box's top edge
    const groups = []; if (dSort !== 'own') list.forEach(it => { const g = groups[groups.length - 1]; if (g && g.r === it.rar) g.items.push(it); else groups.push({ r: it.rar, items: [it] }); });
    $('dItems').classList.toggle('grouped', dSort !== 'own' && !!list.length);
    $('dItems').innerHTML = !list.length ? `<div class="dempty gnote">${t('dress.none')}</div>`
      : dSort === 'own' ? list.map(cell).join('')
      : groups.map(g => `<section class="dgrp r${g.r}" aria-label="${ART.RAR[g.r]}">${sec(g.r)}<div class="dgg">${g.items.map(cell).join('')}</div></section>`).join('');
    // tap an owned icon to wear it; an unowned one shows its name, rarity and how to get it
    $('dItems').querySelectorAll('.dic').forEach(c => { const id = c.dataset.id;
      if (!W.owned.includes(id)) c.onclick = () => dressInfo(ART.byId(id));
      else if (W.av[slot] === id) c.onclick = () => pokeAvatar();
      else c.onclick = () => { W.av[slot] = id; A_.save(W); renderDress(); pokeAvatar(true); }; });
    // SSR / UR cells animate only while on screen (hundreds of them otherwise run at once)
    if (renderDress.io) renderDress.io.disconnect();
    const fx = $('dItems').querySelectorAll('.dic.r3:not(.locked),.dic.r4:not(.locked)');
    if (fx.length && window.IntersectionObserver) { renderDress.io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('vis', e.isIntersecting)), { rootMargin: '80px' }); fx.forEach(c => renderDress.io.observe(c)); }
    else fx.forEach(c => c.classList.add('vis'));
  }
  // phone: keep the fixed kind tabs (#dseg) sitting right on top of the bottom tab bar, whatever its height
  function dsegPos() {
    const st = document.documentElement.style, tb = document.querySelector('.tabs'), hd = document.querySelector('header'), dt = document.querySelector('#pg-dress .dtop');
    if (tb) st.setProperty('--tabsH', tb.offsetHeight + 'px');
    if (hd) st.setProperty('--hdrH', hd.offsetHeight + 'px');   // PC きせかえ: the sticky title/tabs row sits under the header,
    if (dt && dt.offsetHeight) st.setProperty('--dtopH', Math.min(dt.offsetHeight, 140) + 'px');   // (capped: a row wrapped while the page was narrow never pushes the card far down)   //  and the name card under that row
  }
  addEventListener('resize', dsegPos);   // (also places the updates ticker above the tab bar on every tab;
  if (window.ResizeObserver) { const ro = new ResizeObserver(dsegPos); ro.observe(tabsEl); const dt = document.querySelector('#pg-dress .dtop'), hd = document.querySelector('header'); if (dt) ro.observe(dt); if (hd) ro.observe(hd); }   // (the header too: a banner coming and going changed its height and left the name card too low, 2026-11-10)
  addEventListener('hashchange', () => setTimeout(dsegPos, 0)); setTimeout(dsegPos, 1500); if (document.fonts && document.fonts.ready) document.fonts.ready.then(dsegPos);   //  the bar grows when its labels' web font arrives, e.g. Arabic)
  function dressInfo(it) {
    openSheet(`<div class="dinfo"><div class="card item r${it.rar} locked" data-kind="${it.kind}"><span class="rar">${ART.RAR[it.rar]}</span><div class="art">${ART.svg(it.id)}</div></div>
      <h3>${esc(iname(it))}</h3><div class="gnote">${t('kind.' + it.kind)} · ${t('dress.notyet')}</div><p class="dget">${t('dress.get')}</p>
      <div class="dbtns"><button class="btn sun" id="diG">${t('tab.gacha')}</button><button class="btn sky" id="diS">${t('tab.shop')}</button><button class="btn ghost" id="diX">${t('g.close')}</button></div></div>`, 'dsh');
    $('diG').onclick = () => { closeSheet(); go('gacha'); };
    $('diS').onclick = () => { closeSheet(); go('shop'); };
    $('diX').onclick = closeSheet;
  }
  // tap the character in the dress-up preview: it reacts with a random little animation (+ hearts / stars / notes popping out)
  const POSES = ['hop', 'spin', 'wiggle', 'squish', 'dance', 'flip'];
  const PUFF = {
    heart: c => `<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.4 4.4 0 0 1 8-2.6A4.4 4.4 0 0 1 20 10c0 5.8-8 11-8 11z" fill="${c}"/></svg>`,
    star: c => `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" fill="${c}"/></svg>`,
    note: c => `<svg viewBox="0 0 24 24"><path d="M9 17.5V5l11-2v12" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/><circle cx="6.5" cy="17.5" r="3.2" fill="${c}"/><circle cx="17.5" cy="15" r="3.2" fill="${c}"/></svg>`,
  };
  let lastPose = '';
  function pokeAvatar(wear) {
    const av = document.querySelector('#dprev .poke'); if (!av) return;
    let pose = wear ? 'hop' : POSES[Math.floor(Math.random() * POSES.length)];
    if (!wear && pose === lastPose) pose = POSES[(POSES.indexOf(pose) + 1) % POSES.length];
    lastPose = pose;
    POSES.forEach(p => av.classList.remove('p-' + p)); void av.offsetWidth; av.classList.add('p-' + pose);
    clearTimeout(av._t); av._t = setTimeout(() => av.classList.remove('p-' + pose), 1100);
    const it = ART.byId(W.av.icon), rar = it ? it.rar : 0;
    const kinds = pose === 'dance' ? ['note'] : pose === 'spin' || rar >= 3 ? ['star', 'heart'] : ['heart'];
    const cols = rar >= 4 ? ['#ffc928', '#ff8fc7', '#7fd3ff', '#a17cff'] : rar >= 3 ? ['#b08cff', '#ffd34f', '#ff8fc7'] : ['#ff7fa0', '#ffb3c8', '#ffd34f'];
    const n = 4 + Math.min(rar, 3) * 2;
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i'), k = kinds[i % kinds.length], a = (-90 + (i / (n - 1 || 1) - .5) * 150) * Math.PI / 180, d = 60 + Math.random() * 40;
      sp.className = 'puff'; sp.innerHTML = PUFF[k](cols[i % cols.length]);
      sp.style.cssText = `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--r:${(Math.random() - .5) * 60}deg;--s:${.7 + Math.random() * .6};animation-delay:${i * 35}ms`;
      av.appendChild(sp); setTimeout(() => sp.remove(), 1400);
    }
    ({ hop: () => SFX.boing(), spin: () => SFX.whoosh(0, .35), wiggle: () => { SFX.tok(); SFX.tok(160); SFX.tok(320); }, squish: () => SFX.boing(), dance: () => SFX.chime(), flip: () => { SFX.whoosh(0, .3); SFX.tok(420); } })[pose]();
    if (rar >= 3) SFX.shimmer(150);
  }

  /* ---------- overlay / toast / confetti ---------- */
  let sheetClose = null;
  function openSheet(html, cls = '', onClose = null) { $('sheet').className = 'sheet' + (cls ? ' ' + cls : ''); $('sheet').innerHTML = html; $('ov').classList.add('on'); sheetClose = onClose; }
  function closeSheet() { $('ov').classList.remove('on'); const f = sheetClose; sheetClose = null; if (f) f(); }
  $('ov').addEventListener('click', e => { if (e.target === $('ov')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('ov').classList.contains('on')) closeSheet(); });
  let toastT = 0;
  function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }
  function bumpCoins(el) { const p = el || $('coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  // confetti: light on the GPU — a half-resolution canvas (scaled up by CSS), no save/restore per piece,
  // time-based motion (same speed at any frame rate), fewer pieces on phones; a new burst joins the running one
  const CF = { ps: [], run: false };
  window.AtlasConfetti = n => confetti(n);
  function confetti(n) {
    const cv = $('confetti'), g = cv.getContext('2d'), K = .5, W0 = Math.round(innerWidth * K), H0 = Math.round(innerHeight * K);
    if (cv.width !== W0 || cv.height !== H0) { cv.width = W0; cv.height = H0; }
    const cols = ['#ff5d5d', '#ffc928', '#3ccf91', '#36b4ff', '#8d6bff', '#ff7fbe'];
    n = Math.round(n * (matchMedia('(pointer: coarse)').matches ? .5 : .8));
    for (let i = 0; i < n; i++) CF.ps.push({ x: W0 / 2 + (Math.random() - .5) * 100, y: H0 * .45, vx: (Math.random() - .5) * 7 * 60, vy: (-Math.random() * 7 - 2) * 60, r: Math.random() * 6.28, vr: (Math.random() - .5) * 14, s: 3 + Math.random() * 3.5, c: cols[i % cols.length], life: 1.9 + Math.random() * .5 });
    if (CF.run) return; CF.run = true; cv.style.display = 'block';
    let last = performance.now();
    (function step(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W0, H0);
      CF.ps = CF.ps.filter(p => (p.life -= dt) > 0 && p.y < H0 + 20);
      for (const p of CF.ps) {
        p.vy += 13.5 * 60 * dt; p.vx *= Math.pow(.99, dt * 60); p.x += p.vx * dt; p.y += p.vy * dt * .5; p.r += p.vr * dt;
        const c = Math.cos(p.r), sn = Math.sin(p.r); g.setTransform(c, sn, -sn, c, p.x, p.y); g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      }
      g.globalAlpha = 1;
      if (CF.ps.length) requestAnimationFrame(step); else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W0, H0); CF.run = false; cv.style.display = 'none'; }
    })(last);
  }

  /* ---------- welcome: login bonus (character popup) + new achievements ---------- */
  function welcome() {
    const lb = A_.claimLogin(W);
    const fresh = ACH.filter(a => a.done && !W.seen[a.id]);
    refresh();
    if (lb) return loginPop(lb, () => { if (fresh.length) achSheet(fresh); });
    if (fresh.length) achSheet(fresh);
  }
  function achSheet(fresh) {
    const total = fresh.reduce((s, a) => s + A_.TIER_COINS[a.tier], 0), show = fresh.slice(0, 6);
    openSheet(`<h3>${t('ach.got')}</h3><div class="newach">${show.map(achHtml).join('')}${fresh.length > show.length ? `<div class="gnote" style="text-align:center">+${fresh.length - show.length}</div>` : ''}</div>
      <div class="total"><i></i>+${total.toLocaleString()}</div><button class="btn sun" id="take">${t('ach.take')}</button>`);
    $('take').onclick = () => { fresh.forEach(a => { W.seen[a.id] = 1; }); A_.save(W); closeSheet(); bumpCoins(); confetti(90); render(page); };
    confetti(70);
  }
  // the guide characters take turns (one per day) handing over the bonus
  const GUIDES = ['shogi', 'knight', 'disc', 'tile', 'stone', 'dot', 'plop', 'gem', 'dice', 'owl', 'crab', 'gold'];
  const showCoins = n => { $('coinN').textContent = n.toLocaleString(); document.querySelectorAll('.coinM').forEach(e => { e.textContent = n.toLocaleString(); }); };
  function loginPop(lb, after) {
    const day = Math.floor(Date.parse(A_.ymd(Date.now())) / 864e5), gid = GUIDES[day % GUIDES.length];
    const info = window.Icons3D && Icons3D.MON_INFO && Icons3D.MON_INFO[gid], who = info ? (lang === 'ja' ? info.ja : info.en) : '';
    const pos = ((lb.streak - 1) % 7) + 1, from = C.balance - lb.amt;
    showCoins(from);   // the counter rises as the coins land
    let taken = false;
    const take = () => {
      if (taken) return; taken = true;
      const src = $('lbAmt') ? $('lbAmt').querySelector('i').getBoundingClientRect() : null;
      $('ov').classList.remove('on'); sheetClose = null;
      flyCoins(src, from, C.balance, () => { refresh(); if (page === 'home') renderProfile(); else if (page === 'dress') renderCard(); after && after(); });
      confetti(90);
    };
    openSheet(`<div class="lbp">
        <div class="lb-sky"><span class="rays"></span><img class="lb-ch" src="../images/atlas/g-${gid}.webp?v=1" alt="">
          <div class="lb-bub">${who ? `<b>${esc(who)}</b>` : ''}<span>${esc(t('lb.say'))}</span></div></div>
        <h3>${esc(t('login.h'))}</h3>
        <div class="lb-week">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="${d < pos ? 'on' : d === pos ? 'on now' : ''}${d === 7 ? ' big' : ''}">${d === 7 ? '★' : d}</span>`).join('')}</div>
        <div class="lb-st">🔥 ${esc(t('login.day', { n: lb.streak }))} · ${esc(t('lb.week'))}</div>
        <div class="total" id="lbAmt"><i></i>+${lb.amt.toLocaleString()}</div>
        <button class="btn sun big" id="lbTake">${esc(t('ach.take'))}</button></div>`, 'lbs', take);
    $('lbTake').onclick = take;
    SFX.fanfare(250);
    // the first burst waits for the page to have loaded (images decoding, fonts) so it isn't drawn over a busy main thread
    const burst = () => setTimeout(() => { if (!taken) confetti(40); }, 420);
    if (document.readyState === 'complete') burst(); else addEventListener('load', burst, { once: true });
  }
  // coins burst out of the popup and fly into the coin counter (header pill, or the hero's pill on phones)
  function flyCoins(src, from, to, done) {
    const vis = e => e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().bottom > 0;
    const tgtEl = [$('coinPill'), document.querySelector('.heroCoin'), document.querySelector('#prof .coin')].find(vis);
    const tr = tgtEl ? tgtEl.querySelector('i').getBoundingClientRect() : { left: innerWidth - 60, top: 20, width: 24, height: 24 };
    const sx = src ? src.left + src.width / 2 : innerWidth / 2, sy = src ? src.top + src.height / 2 : innerHeight / 2;
    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2, N = 12;
    let landed = 0;
    for (let i = 0; i < N; i++) {
      const c = document.createElement('i'); c.className = 'flycoin'; c.style.left = sx + 'px'; c.style.top = sy + 'px'; document.body.appendChild(c);
      const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 70, bx = Math.cos(a) * r, by = Math.sin(a) * r - 30;
      const an = c.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
        { transform: `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) scale(1.15) rotateY(180deg)`, opacity: 1, offset: .3 },
        { transform: `translate(calc(-50% + ${(bx + tx - sx) * .5}px), calc(-50% + ${Math.min(by, ty - sy) - 60}px)) scale(1) rotateY(360deg)`, offset: .65 },
        { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(.6) rotateY(540deg)`, opacity: 1 },
      ], { duration: 820, delay: i * 55, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' });
      an.onfinish = () => { c.remove(); landed++; showCoins(Math.round(from + (to - from) * landed / N)); SFX.coin(); bumpCoins(tgtEl);
        if (landed === N) { showCoins(to); done && done(); } };
    }
  }

  /* ---------- language apply ---------- */
  // the sub line under a kicker-style title never grows wider than the main title
  function fitWM(b, sm) { if (!b || !sm) return; sm.style.fontSize = ''; const k = b.querySelector('.wk'); if (!k || sm.hidden) return; const r = document.createRange(); r.setStartAfter(k); r.setEnd(b, b.childNodes.length); const mw = r.getBoundingClientRect().width, sw = sm.scrollWidth; if (mw > 0 && sw > mw) sm.style.fontSize = Math.max(7, parseFloat(getComputedStyle(sm).fontSize) * mw / sw * .98) + 'px'; }
  const fitBrand = () => fitWM($('wm'), $('wmSub'));
  if (document.fonts) document.fonts.ready.then(() => fitBrand()); addEventListener('resize', () => fitBrand());
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const title = t('title');
    $('wm').innerHTML = lang === 'en' || /[^\x00-\x7f]/.test(title) === false ? [...title].map(c => `<span>${esc(c)}</span>`).join('') : esc(title);
    if (lang === 'ja') $('wm').innerHTML = [...title].map(c => `<span>${esc(c)}</span>`).join('');
    { const KW = {"en": ["WORLD", "Board Game Atlas"], "es": ["ATLAS MUNDIAL", "Juegos de Mesa"], "fr": ["ATLAS MONDIAL", "Jeux de société"], "pt": ["ATLAS MUNDIAL", "Jogos de Tabuleiro"], "de": ["WELT", "Brettspiel-Atlas"], "id": ["ATLAS DUNIA", "Permainan Papan"], "tr": ["DÜNYA ATLASI", "Masa Oyunları"]}[lang]; if (KW) $('wm').innerHTML = `<i class="wk">${esc(KW[0])}</i>` + [...KW[1]].map(c => `<span>${esc(c)}</span>`).join(''); }   // Latin languages: a small ruled kicker over the shorter main title
    $('wmSub').textContent = t('sub');
    fitBrand();
    document.title = title + ' — ' + (lang === 'en' ? '世界のボドゲ大百科' : 'World Board Game Atlas');
    $('langSel').value = lang; $('langCode').textContent = lang === 'zh-TW' ? 'TW' : lang.toUpperCase();
    $('homeBtn').setAttribute('aria-label', t('tab.home')); $('footBack').textContent = t('back');
    tabsEl.querySelectorAll('.tab').forEach(b => { b.querySelector('span').textContent = t('tab.' + b.dataset.k); });
    document.querySelectorAll('#gsSeg button').forEach(b => { b.textContent = t('tab.' + b.dataset.v); });
  }
  // game-styled language picker (the native <select> stays as the source of the options)
  const LNAME = { ja: 'Japanese', en: 'English', zh: 'Chinese', ko: 'Korean', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', 'zh-TW': 'Chinese', id: 'Indonesian', tr: 'Turkish' };
  function openLang(on) {
    const pop = $('langPop'), btn = $('langBtn');
    if (on === undefined) on = pop.hidden;
    if (on) pop.innerHTML = [...$('langSel').options].map(o => `<button type="button" role="option" data-l="${o.value}" aria-selected="${o.value === lang}"><b>${esc(o.text)}</b><small>${o.value === 'zh-TW' ? 'TW' : o.value.toUpperCase()} · ${LNAME[o.value]}</small></button>`).join('');
    pop.hidden = !on; btn.setAttribute('aria-expanded', on);
    pop.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { openLang(false); if (b.dataset.l !== lang) { $('langSel').value = b.dataset.l; $('langSel').dispatchEvent(new Event('change')); } });
  }
  $('langBtn').onclick = e => { e.stopPropagation(); openLang(); };
  document.addEventListener('click', e => { if (!$('langPop').hidden && !$('langPop').contains(e.target)) openLang(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('langPop').hidden) openLang(false); });
  $('langSel').onchange = e => { lang = e.target.value; try { localStorage.setItem('aicoding-lang', lang); } catch (x) {} applyLang(); render(page); };

  // ボドゲ地図: atlas/worldmap.js draws the map; a pin's ▶ flies its icon into the board view like the home icons
  function renderMap() {
    if (!window.AtlasMap) return;
    AtlasMap.render($('pg-map'), { games: A_.GAMES, lang, gname, no: gno, art: g => artImg(g), open: (id, img) => flyOpen(id, img) });
  }
  // the header's house: the Atlas's own home tab (not the CALMDUST top page); over a board it reloads the portal's home
  { const hb = $('homeBtn'); if (hb) hb.addEventListener('click', e => { if (document.querySelector('#bv.on,#hist.on') || document.documentElement.classList.contains('hs-open')) return;
    e.preventDefault(); if (page !== 'home') go('home'); scrollTo({ top: 0, behavior: 'smooth' }); }); }
  function render(k) {
    sfxIcon(); npcIcon();
    renderUpdLine();
    if (k === 'home') renderHome(); else if (k === 'games') renderGames(); else if (k === 'map') renderMap(); else if (k === 'ach') renderAch();
    else if (k === 'gacha') { renderGacha(); renderShop(); } else if (k === 'dress') renderDress();
  }
  // progress may change in another tab (a game) — re-read when coming back
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !session) { W = A_.load(); refresh(); render(page); welcome(); } });
  /* ---------- idle: pause CSS/SVG animations while the tab is hidden or the window isn't focused ---------- */
  (function idle() {
    const st = document.createElement('style'); st.textContent = 'html.atlas-idle *,html.atlas-idle *::before,html.atlas-idle *::after{animation-play-state:paused!important}'; document.head.appendChild(st);
    const set = () => { const on = document.hidden || !document.hasFocus(); document.documentElement.classList.toggle('atlas-idle', on); document.querySelectorAll('svg').forEach(s => { try { on ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} }); };
    document.addEventListener('visibilitychange', set); addEventListener('blur', set); addEventListener('focus', set);
  })();

  applyLang(); refresh(); dsegPos();
  const [h0, h1] = (location.hash || '#home').slice(1).split('/');
  go(h0, false);
  history.replaceState(null, '', '#' + page);
  if (h1) openBoard(h1);
  welcome();
})();
