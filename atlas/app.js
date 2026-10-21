/* World Board Game Atlas — portal app */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = window.ATLAS_I18N, A_ = window.Atlas, ART = window.AtlasArt;

  /* ---------- language ---------- */
  let lang = 'ja';
  try { lang = localStorage.getItem('aicoding-lang') || (navigator.language || 'ja').slice(0, 2); } catch (e) {}
  if (!I[lang]) lang = 'ja';
  const t = (k, v) => { let s = (I[lang] && I[lang][k]) ?? I.en[k] ?? I.ja[k] ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const gname = g => g.name[lang] || g.name.en;
  const iname = it => it.name[lang] || it.name.en;
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

  /* ---------- tabs ---------- */
  const ICO = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
    games: '<rect x="3" y="7" width="18" height="11" rx="5.5"/><path d="M8 10.5v4M6 12.5h4"/><circle cx="15.5" cy="11.5" r="1" fill="currentColor"/><circle cx="17.5" cy="13.8" r="1" fill="currentColor"/>',
    ach: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
    shop: '<path d="M4 9h16l-1.5 11h-13z"/><path d="M8.5 9a3.5 3.5 0 0 1 7 0"/>',
    gacha: '<circle cx="12" cy="9.5" r="6.5"/><path d="M6 15h12v5H6zM5.5 9.5h13"/><circle cx="12" cy="17.5" r="1.2" fill="currentColor"/>',
    dress: '<path d="M9 4l3 2 3-2 5 3-2 4-2-1v10H8V10l-2 1-2-4z"/>',
  };
  const TABS = ['home', 'games', 'ach', 'shop', 'gacha', 'dress'];
  const tabsEl = $('tabs');
  TABS.forEach(k => {
    const b = document.createElement('button'); b.className = 'tab'; b.role = 'tab'; b.dataset.k = k;
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</svg><span></span>`;
    b.onclick = () => go(k); tabsEl.appendChild(b);
  });
  let page = 'home';
  function go(k, push = true) {
    if (!TABS.includes(k)) k = 'home';
    page = k;
    tabsEl.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.k === k));
    document.querySelectorAll('section.pg').forEach(s => s.classList.toggle('on', s.id === 'pg-' + k));
    if (push) history.replaceState(null, '', '#' + k);
    render(k);
    if (push) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- common renderers ---------- */
  const R3 = new Set(['reversi', 'shogi', 'chess', 'gomoku', 'dots', 'connect4', 'mancala', 'backgammon', 'morris', 'sudoku', 'speedsudoku', 'checkers', 'samegame']);   // images/atlas/<id>.webp exists
  const artSrc = g => R3.has(g.id) ? `../images/atlas/${g.id}.webp?v=${g.id === "speedsudoku" || g.id === "checkers" ? 3 : g.id === "samegame" ? 1 : 2}` : `../${g.icon}`;
  const artImg = (g, extra = '') => `<img src="${artSrc(g)}" alt="" loading="lazy" decoding="async"${R3.has(g.id) ? '' : ' class="flat"'}${extra}>`;
  const g3 = g => `<span class="g3" style="--c:${g.color}">${artImg(g)}</span>`;
  const gno = g => 'No.' + String(A_.GAMES.indexOf(g) + 1).padStart(2, '0');
  function tagHtml(k) { const T = A_.TAGS[k]; return `<span class="tag" style="--c:${T.c}"><svg viewBox="0 0 24 24"><path d="${T.i}"/></svg>${esc(t('tag.' + k))}</span>`; }
  function badgeHtml(b) { return `<span class="badge ${b}">${{ new: 'NEW', update: 'UPDATE', beta: 'BETA', premium: 'PREMIUM' }[b]}</span>`; }
  function ring(pct, col) {
    const r = 22, c = 2 * Math.PI * r;
    return `<span class="ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#efe8d6" stroke-width="6"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * pct / 100} ${c}"/></svg>${pct}%</span>`;
  }
  function gameCard(g) {
    const r = P[g.id];
    const rows = [];
    if (g.total.pz) rows.push([t('pg.pz'), r.pz || 0, g.total.pz]);
    if (g.total.ls) rows.push([t('pg.ls'), r.ls || 0, g.total.ls]);
    const extra = [];
    if (r.dl && r.dl.days) extra.push(`${t('pg.dl')} ${t('pg.days', { n: r.dl.days })}`);
    if (r.rt && r.rt.n) extra.push(`${t('pg.rt')} ${r.rt.r}`);
    if (r.op) extra.push(`${t('pg.op')} ${r.op}`);
    return `<a class="card gc" href="../${g.href}" data-open="${g.id}">
      <div class="top">${g3(g)}
        <div style="min-width:0"><h4>${esc(gname(g))}</h4><div class="bd">${A_.badges(g).map(badgeHtml).join('')}</div></div>${ring(r.pct, g.color)}</div>
      ${rows.length ? `<div class="pgl">${rows.map(([l, a, b]) => `<span>${l}</span><span class="bar" style="--c:${g.color}"><i style="width:${Math.min(100, a / b * 100)}%"></i></span><b>${Math.min(a, b)}/${b}</b>`).join('')}</div>` : ''}
      <p class="about">${esc(t('about.' + g.id))}</p>
      <div class="tags">${g.tags.filter(k => k !== 'mobile').slice(0, 4).map(tagHtml).join('')}</div>
      <div class="ft"><small style="font-weight:700;color:var(--ink2);font-size:12px">${extra.join(' · ') || (r.touched ? '' : t('pg.none'))}</small><span class="btn sm">${t('play')}</span></div>
    </a>`;
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
  function itemCard(it, foot, extraCls = '') {
    return `<div class="card item r${it.rar} ${extraCls}" data-kind="${it.kind}" data-id="${it.id}"><span class="rar">${ART.RAR[it.rar]}</span>
      <div class="art">${ART.svg(it.id)}</div><div class="nm">${esc(iname(it))}</div><div class="kd">${t('kind.' + it.kind)}</div>${foot || ''}</div>`;
  }
  function avatar(size) { return ART.avatar(W.av, size); }

  /* ---------- HOME ---------- */
  const GLOGO = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  function renderAcc() {
    const host = document.querySelector('#prof .accw'); if (!host || !window.AtlasAccount) return;
    let el = document.getElementById('acc'); if (!el) { el = document.createElement('div'); el.id = 'acc'; el.className = 'acc'; host.appendChild(el); }
    const s = AtlasAccount.state();
    if (!s.available) { el.innerHTML = `<span>🔒 ${t('acc.soon')}</span>`; el.title = t('acc.note'); return; }
    if (!s.user) { el.innerHTML = `<button class="gbtn" id="accIn" title="${esc(t('acc.note'))}">${GLOGO}${t('acc.in')}</button>`; $('accIn').onclick = () => AtlasAccount.signIn(); return; }
    const when = s.last ? new Date(s.last).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = `${s.user.photo ? `<img src="${esc(s.user.photo)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(s.user.email || s.user.name)}</span>
      <span class="${s.err ? '' : 'ok'}">${s.syncing ? t('acc.syncing') : s.err ? t('acc.err') : '✓ ' + t('acc.synced') + ' ' + when}</span><button class="btn sm ghost" id="accOut">${t('acc.out')}</button>`;
    $('accOut').onclick = () => AtlasAccount.signOut();
  }
  if (window.AtlasAccount) {
    AtlasAccount.on(() => renderAcc());
    window.addEventListener('atlas-synced', () => { W = A_.load(); refresh(); if (!session) render(page); });
    // when the name changes, fill it in from Google if empty
    AtlasAccount.on(st => { if (st.user && !W.name && st.user.name) { W.name = st.user.name.slice(0, 16); A_.save(W); if (A_.shareName) A_.shareName(W.name, true); const ni = $('nameIn'); if (ni) ni.value = W.name; } });
  }
  // floating toy pieces around the title: [piece image, game, x%, y%, width px, rotation]
  const PROPS = [['die', 'backgammon', 9, 22, 92, -12], ['shogi', 'shogi', 22, 14, 84, 8], ['knightB', 'chess', 6, 70, 96, 0], ['disc', 'reversi', 20, 84, 104, -6],
    ['stoneB', 'gomoku', 33, 92, 70, 0], ['c4', 'connect4', 92, 20, 92, 14], ['gem', 'mancala', 78, 10, 64, 0], ['tile', 'sudoku', 95, 64, 80, 10],
    ['checker', 'morris', 80, 88, 92, -8], ['knight', 'chess', 66, 92, 86, 6], ['stoneW', 'gomoku', 45, 8, 60, 0], ['gem2', 'mancala', 60, 6, 54, 0],
    ['shogi2', 'shogi', 3, 45, 70, -14], ['pawn', 'chess', 97, 42, 64, 0], ['bgChecker', 'backgammon', 50, 95, 72, 0]];
  // title emblem: a compass seal (the "atlas") with ring lettering and a swallow-tail ribbon
  const TF = 'RocknRoll One';   // title face: characterful but stays legible (Dela Gothic crushed the dakuten)
  function emblem(main, pre, n) {
    const ring = 'WORLD BOARD GAME ATLAS ✦ 世界のボドゲ大全 ✦ WORLD BOARD GAME ATLAS ✦ 世界のボドゲ大全 ✦ ';
    const big = main.length <= 5 ? 76 : Math.max(30, Math.round(380 / (main.length * .92)));
    const pts = (len, w) => [0, 90, 180, 270].map(a => `<path d="M320 ${200 - len}L${320 + w} 200H${320 - w}z" transform="rotate(${a} 320 200)"/>`).join('');
    return `<svg viewBox="0 0 640 400" role="img" aria-hidden="true">
      <defs><path id="ringP" d="M320 200m-153 0a153 153 0 1 1 306 0a153 153 0 1 1-306 0"/></defs>
      <circle cx="320" cy="200" r="176" fill="#111"/>
      <g><animateTransform attributeName="transform" type="rotate" from="0 320 200" to="360 320 200" dur="20s" repeatCount="indefinite"/><text font-family="Fredoka,'Zen Maru Gothic',sans-serif" font-weight="700" font-size="15.5" letter-spacing="3.2" fill="#fff"><textPath href="#ringP">${ring}</textPath></text></g>
      <circle cx="320" cy="200" r="136" fill="#fff"/>
      <circle cx="320" cy="200" r="128" fill="none" stroke="#111" stroke-width="2" stroke-dasharray="3 5"/>
      <g fill="#111" opacity=".16">${pts(118, 22)}</g>
      <g fill="#111" transform="rotate(45 320 200)" opacity=".1">${pts(92, 16)}</g>
      <g fill="#111">${[0, 90, 180, 270].map(a => `<path d="M320 ${200 - 124}L320 200H${320 - 22}z" transform="rotate(${a} 320 200)"/>`).join('')}</g>
      <!-- ribbon -->
      <path d="M40 160H600L580 205L600 250H40L60 205Z" fill="#111" transform="translate(8 8)"/>
      <path d="M40 160H600L580 205L600 250H40L60 205Z" fill="#fff" stroke="#111" stroke-width="6" stroke-linejoin="round"/>
      <path d="M86 172H554M86 238H554" stroke="#111" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
      ${pre ? `<rect x="268" y="112" width="104" height="38" rx="6" fill="#111"/><text x="320" y="139" text-anchor="middle" font-family="'${TF}',sans-serif" font-size="22" letter-spacing="1" fill="#fff">${esc(pre)}</text>` : ''}
      <text x="320" y="${205 + big * .36}" text-anchor="middle" font-family="'${TF}','Zen Maru Gothic',sans-serif" font-size="${big}" fill="#111" letter-spacing="${Math.round(big * .05)}">${esc(main)}</text>
      <g transform="translate(320 286)"><rect x="-66" y="-17" width="132" height="34" rx="17" fill="#111"/><text y="8" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="22" fill="#fff">${n}<tspan font-family="Fredoka,sans-serif" font-weight="700" font-size="13" dx="6" letter-spacing="2">GAMES</tspan></text></g>
      <!-- piece tips on the compass -->
      <g fill="#fff" stroke="#111" stroke-width="4">
        <g transform="translate(320 72) scale(.8)"><circle r="13"/><path d="M-12 30h24l-4-14h-16z"/></g>
        <g transform="translate(412 112) rotate(14) scale(.8)"><rect x="-15" y="-15" width="30" height="30" rx="7"/><circle cx="-6" cy="-6" r="2.6" fill="#111" stroke="none"/><circle cx="6" cy="6" r="2.6" fill="#111" stroke="none"/></g>
        <g transform="translate(228 112) rotate(-10) scale(.8)"><path d="M0-19l13 6 4 30h-34l4-30z"/></g>
      </g>
    </svg>`;
  }
  // SVG text doesn't always trigger web-font loading (iOS Safari) → load the title face explicitly, then redraw
  let tfReady = false;
  if (document.fonts && document.fonts.load) document.fonts.load(`40px "${TF}"`, 'ボドゲ大全世界の').then(() => { tfReady = true; if (page === 'home') renderHero(); }).catch(() => {});
  function renderHero() {
    const ja = lang === 'ja', phone = innerWidth < 760;
    $('ttl').innerHTML = emblem(ja ? 'ボドゲ大全' : t('title'), ja ? '世界の' : '', A_.GAMES.length);
    $('ttl').setAttribute('aria-label', t('title') + ' — World Board Game Atlas');
    $('props').innerHTML = PROPS.filter((_, i) => !phone || i < 11).map(([img, gid, x, y, w, r], i) => `<img src="../images/atlas/p-${img}.webp?v=1" alt="" data-g="${gid}" style="--x:${x}%;--y:${y}%;--w:${Math.round(w * (phone ? .62 : 1))}px;--r:${r}deg;--d:${2.6 + (i % 5) * .5}s;--dl:${-i * .37}s">`).join('');
    $('props').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { hop(b, true); setTimeout(() => openBoard(b.dataset.g), 380); });
    startProps();
  }
  /* floating pieces: bob + sway, random hops/spins, follow the pointer / phone tilt a little (JS, so it runs on every browser) */
  let propRaf = 0, px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma != null) { tx = Math.max(-.5, Math.min(.5, e.gamma / 60)); ty = Math.max(-.5, Math.min(.5, (e.beta - 40) / 80)); } }, { passive: true });
  function hop(el, big) { el._hop = performance.now(); el._big = !!big; }
  function startProps() {
    cancelAnimationFrame(propRaf);
    const els = [...$('props').querySelectorAll('img')];
    els.forEach((el, i) => { el._ph = i * 1.7; el._sp = .7 + (i % 5) * .12; el._r = parseFloat(el.style.getPropertyValue('--r')) || 0; el._z = .4 + (i % 4) * .2; });
    let nextHop = performance.now() + 1200;
    let lastP = 0;
    (function step(now) {
      propRaf = requestAnimationFrame(step);
      if (document.hidden || page !== 'home' || !els[0] || !els[0].isConnected) return;
      if (now - lastP < (document.hasFocus() ? 1000 / 60 : 100) - 2) return;   // 60 fps cap, 10 fps when the window isn't focused
      lastP = now;
      if ($('bv').classList.contains('on')) return;   // hidden behind the 3D board
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
    })(performance.now());
  }
  // after load, in idle time: start the 3D table, then build every board ahead of time (one per idle slice),
  // so tapping an icon never has to build a board while the fly / smoke / sparkle effects are playing
  const idle = window.requestIdleCallback ? (f => requestIdleCallback(f, { timeout: 2500 })) : (f => setTimeout(f, 300));
  idle(() => {
    if (!glOK) initGL(); if (!glOK) return;
    const q = A_.byUpdate().map(g => g.id);
    const next = () => { if (!q.length) return; idle(() => { const id = q.shift(); if ($('bv').classList.contains('on') || flying) { q.unshift(id); return setTimeout(next, 600); } try { warm(id); } catch (e) {} next(); }); };
    setTimeout(next, 400);
  });
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
  function renderHome() {
    renderHero();
    $('hUpd').textContent = t('upd.h'); $('hIcons').textContent = t('upd.games');
    const seen = new Set(), ups = A_.UPDATES.filter(u => !seen.has(u[1]) && seen.add(u[1]));
    $('updRow').innerHTML = ups.map(u => { const g = A_.GAMES.find(x => x.id === u[1]);
      return `<button class="ut" data-g="${g.id}" style="--c:${g.color}"><span class="pan"><span class="new">${A_.badges(g).slice(0, 1).map(badgeHtml).join('')}</span><span class="dt">${fmtDate(u[0])}</span>${artImg(g)}</span>
        <span class="tx"><b>${esc(gname(g))}</b><p>${esc(utx(u))}</p></span></button>`; }).join('');
    updNav();
    document.querySelectorAll('#updRow [data-g]').forEach(b => { b.onclick = () => flyOpen(b.dataset.g, b.querySelector('img')); });
    renderFilter(); renderGrid();
    renderProfile(); renderToday();
  }

  /* home game list: category chips + search (the chip is remembered per viewer) */
  let gCat = 'all', gQ = '';
  try { gCat = localStorage.getItem('atlas-cat') || 'all'; } catch (e) {}
  if (gCat !== 'all' && !(A_.CATS || []).includes(gCat)) gCat = 'all';
  // lower-case, full-width → half-width, katakana → hiragana: 「りばーし」 finds リバーシ
  const norm = s => String(s).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[\s・·\-_.]/g, '');
  const hay = g => norm([g.id, ...Object.values(g.name), ...g.tags, ...g.tags.map(k => t('tag.' + k)), ...g.tags.map(k => I.en['tag.' + k] || ''), t('cat.' + g.cat)].join('|'));
  function visibleGames() {
    const q = norm(gQ.trim());
    return A_.byUpdate().filter(g => (gCat === 'all' || g.cat === gCat) && (!q || hay(g).includes(q)));
  }
  const SRCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
  function renderFilter() {
    const cats = ['all', ...(A_.CATS || [])];
    $('catChips').innerHTML = cats.map(k => { const n = k === 'all' ? A_.GAMES.length : A_.GAMES.filter(g => g.cat === k).length;
      return `<button type="button" class="chip cat" data-k="${k}" aria-pressed="${gCat === k}">${esc(t('cat.' + k))} <em>${n}</em></button>`; }).join('');
    $('catChips').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { gCat = b.dataset.k; try { localStorage.setItem('atlas-cat', gCat); } catch (e) {}
      $('catChips').querySelectorAll('[data-k]').forEach(x => x.setAttribute('aria-pressed', x.dataset.k === gCat)); SFX.tok(); renderGrid(); });
    const s = $('gSearch'); s.placeholder = t('search.ph'); s.setAttribute('aria-label', t('search.ph')); s.value = gQ;
    s.oninput = () => { gQ = s.value; renderGrid(); };
    $('gSearchIc').innerHTML = SRCH;
  }
  // the random tile: an isometric die with "?" faces on a thick base, drawn like the 3D game icons
  const RND_SVG = `<svg class="dieic" viewBox="0 0 200 200" aria-hidden="true">
    <g stroke-linejoin="round" stroke-width="10">
      <path d="M16 122 100 166 100 184 16 140Z" fill="#7552e0" stroke="#7552e0"/><path d="M100 166 184 122 184 140 100 184Z" fill="#5a3cc4" stroke="#5a3cc4"/>
      <path d="M100 78 184 122 100 166 16 122Z" fill="#a98bff" stroke="#a98bff"/></g>
    <g fill="#fff" opacity=".35"><circle cx="46" cy="122" r="4"/><circle cx="154" cy="122" r="4"/><circle cx="100" cy="94" r="4"/><circle cx="100" cy="150" r="4"/></g>
    <ellipse cx="100" cy="131" rx="56" ry="22" fill="#3a2390" opacity=".28"/>
    <g class="cube" stroke-linejoin="round" stroke-width="7">
      <path d="M48 54 100 80 100 136 48 110Z" fill="#f3eeff" stroke="#f3eeff"/><path d="M100 80 152 54 152 110 100 136Z" fill="#dcd0ff" stroke="#dcd0ff"/>
      <path d="M100 28 152 54 100 80 48 54Z" fill="#fff" stroke="#fff"/>
      <g transform="matrix(.52 .26 0 .56 48 54)"><text x="50" y="80" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="78" fill="#ff5d5d">?</text></g>
      <g transform="matrix(.52 -.26 0 .56 100 80)"><text x="50" y="80" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="78" fill="#36b4ff">?</text></g>
      <g transform="matrix(.52 -.26 .52 .26 48 54)" fill="#ffc928"><circle cx="26" cy="26" r="10"/><circle cx="50" cy="50" r="10"/><circle cx="74" cy="74" r="10"/></g>
    </g></svg>`;
  function renderGrid() {
    const list = visibleGames();
    const rnd = list.length ? `<button type="button" class="ic rnd" id="rndTile" style="--c:#8d6bff" aria-label="${esc(t('rnd.n'))}"><span class="art">${RND_SVG}<img class="rimg" alt="" decoding="async" hidden></span>
      <span class="lab"><span class="n">${esc(t('rnd.n'))}</span><span class="pr"><i style="width:100%"></i></span></span></button>` : '';
    $('iconGrid').innerHTML = rnd + list.map(g => { const b = A_.badges(g).filter(x => x !== 'premium')[0];
      return `<button class="ic" data-g="${g.id}" style="--c:${g.color}"><span class="art"><span class="no">${gno(g)}</span>${artImg(g)}</span>${b ? `<span class="bdg">${badgeHtml(b)}</span>` : ''}
        <span class="lab"><span class="n">${esc(gname(g))}</span><span class="pr"><i style="width:${P[g.id].pct}%"></i></span></span></button>`; }).join('');
    $('gNone').hidden = !!list.length; $('gNone').textContent = t('search.none');
    $('iconGrid').querySelectorAll('[data-g]').forEach(b => { b.onclick = () => flyOpen(b.dataset.g, b.querySelector('img')); });
    if ($('rndTile')) $('rndTile').onclick = () => rollRandom(list);
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
    el.style.setProperty('--c', g.color);
    el.innerHTML = `<span class="pan">${artImg(g).replace(' loading="lazy"', '')}</span>
      <span class="tx"><span class="kk"><span class="lbl">☀ ${esc(t('today.h'))}</span><span class="dt">${esc(new Date().toLocaleDateString(lang, { month: 'short', day: 'numeric', weekday: 'short' }))}</span></span>
        <b>${esc(gname(g))}</b><span class="hs">${esc(t('hist.' + g.id))}</span>
        <span class="ft"><span class="tags">${g.tags.filter(k => k !== 'mobile').slice(0, 3).map(tagHtml).join('')}</span><span class="btn sm">${esc(t('today.go'))} ▶</span></span></span>`;
    el.setAttribute('aria-label', t('today.h') + ': ' + gname(g));
    el.onclick = () => flyOpen(g.id, el.querySelector('.pan img'));
  }

  /* ---------- 3D board viewer ---------- */
  let glOK = false, bvGame = null, session = null;
  const pref = (() => { try { return JSON.parse(localStorage.getItem('atlas-play') || '{}'); } catch (e) { return {}; } })();
  function initGL() {
    if (glOK || !window.THREE) return glOK;
    try { Table3D.mount($('gl')); glOK = true; } catch (e) { glOK = false; }
    return glOK;
  }
  /* tap an icon → it flies to the centre spinning, then turns into the 3D board (≈0.8 s) */
  let flying = false;
  function warm(id) { if (initGL()) Table3D.prepare(id, window.Icons3D && Icons3D.ICONS[id] ? Icons3D.ICONS[id]() : null); }
  function flyOpen(id, img) {
    if (flying) return;
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
      requestAnimationFrame(() => setTimeout(() => {
        openBoard(id, true, true);
        requestAnimationFrame(() => requestAnimationFrame(finish));
        setTimeout(finish, 900);
      }, 0));
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
  function openBoard(id, push = true, flown = false) {
    const g = A_.GAMES.find(x => x.id === id); if (!g) return;
    bvGame = g; stopSession();
    $('bv').classList.add('on'); $('bv').classList.remove('playing'); $('endc').classList.remove('on');
    document.body.style.overflow = 'hidden';
    if (push) history.replaceState(null, '', '#' + page + '/' + id);
    if (initGL()) {
      Table3D.show(id, null, flown ? { magic: true, hold: true } : {}); Table3D.play(false);
    }
    else $('gl').innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center"><img src="${artSrc(g)}" alt="" style="width:min(70vw,420px)"></div>`;
    const ad = glOK && window.Atlas3D && Atlas3D[id], r = P[id];
    const rows = [];
    if (g.total.pz) rows.push([t('pg.pz'), r.pz || 0, g.total.pz]);
    if (g.total.ls) rows.push([t('pg.ls'), r.ls || 0, g.total.ls]);
    const lv = pref[id + ':lv'] || Math.min(4, ad ? ad.levels : 4), side = pref[id + ':side'] || 1;
    const mode = ad && ad.modes && ad.modes.includes(pref[id + ':mode']) ? pref[id + ':mode'] : 'ai';
    $('bvi').innerHTML = `<div class="cols"><div class="L"><div class="row">${g3(g)}<div style="min-width:0;flex:1"><h3>${esc(gname(g))}</h3><div class="bd">${A_.badges(g).map(badgeHtml).join('')}</div></div>${glOK && window.AtlasRules && AtlasRules[id] ? `<button type="button" class="rulesb" id="bvRules"><span>📖</span><b>${t('bv.rules')}</b></button>` : ''}${ring(r.pct, g.color)}</div>
      <div class="tags">${g.tags.filter(k => k !== 'mobile').map(tagHtml).join('')}</div>
      ${rows.length ? `<div class="pgl">${rows.map(([l, a, b]) => `<span>${l}</span><span class="bar" style="--c:${g.color}"><i style="width:${Math.min(100, a / b * 100)}%"></i></span><b>${Math.min(a, b)}/${b}</b>`).join('')}</div>` : ''}
      </div><div class="R">${ad && ad.modes ? `<div class="mtab3" id="bvMode">${ad.modes.map(m => `<button type="button" data-m="${m}" class="${m === mode ? 'on' : ''}">${t('bv.m.' + m)}</button>`).join('')}</div><div class="mnote" id="bvMNote"></div>` : ''}${ad ? `<div class="opts" id="bvOpts"><label>${t('bv.level')}<select id="bvLv">${Array.from({ length: ad.levels }, (_, i) => `<option value="${i + 1}" ${i + 1 === lv ? 'selected' : ''}>Lv.${i + 1}${ad.levelInfo ? ' ' + esc(ad.levelInfo(i + 1, lang).name) : ''}</option>`).join('')}</select></label>
        ${ad.sides ? `<label>${t('bv.side')}<select id="bvSide"><option value="1" ${side === 1 ? 'selected' : ''}>${t('bv.first')}</option><option value="2" ${side === 2 ? 'selected' : ''}>${t('bv.second')}</option></select></label>` : ''}${ad.levelInfo ? `<div class="lvinfo" id="bvLvInfo"></div>` : ''}</div>` : `<div class="soon">${g.id === 'sudoku' || g.id === 'speedsudoku' || g.id === 'samegame' ? '' : t('bv.soon')}</div>`}
      <div class="act">${ad ? `<button class="btn big" id="bvStart">${t('bv.start')} ▶</button><a class="btn ghost big2" href="../${g.href}">${t('bv.classic')}</a>` : `<a class="btn big" href="../${g.href}">${t('play')} ▶</a>`}</div></div></div>`;
    if (ad) $('bvStart').onclick = startPlay;
    if ($('bvMode')) {   // AI / rated / two players: only the AI game has a level and a side to pick
      // the card keeps the AI-game height: the note of the other modes fills the space the level / side rows take
      let midH = 0;
      const setMode = m => { $('bvMode').dataset.v = m; $('bvMode').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
        if (!midH) { $('bvOpts').hidden = false; midH = $('bvOpts').offsetHeight; }
        $('bvOpts').hidden = m !== 'ai'; $('bvMNote').hidden = m === 'ai'; $('bvMNote').textContent = m === 'ai' ? '' : t('bv.m.' + m + 'Note');
        $('bvMNote').style.minHeight = midH ? midH + 'px' : ''; fitStage(); };
      if (window.__bvModeRz) removeEventListener('resize', window.__bvModeRz);
      window.__bvModeRz = () => { if (!$('bvOpts') || !$('bvMode')) return; midH = 0; setMode($('bvMode').dataset.v); }; addEventListener('resize', window.__bvModeRz);
      $('bvMode').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
      setMode(mode);
    }
    if ($('bvRules')) $('bvRules').onclick = startRules;
    // phones: a grab handle on the card — swipe down (or tap) folds away the tags and progress, leaving the game settings; swipe up opens it again
    if (matchMedia('(max-width: 819px)').matches) {
      // phones: tags + progress live in a drawer above the settings; it follows the finger (swipe up opens, down closes)
      const card = $('bvi'), L = card.querySelector('.L'), grab = document.createElement('div'); grab.className = 'grab'; grab.innerHTML = '<i></i>'; card.prepend(grab);
      const more = document.createElement('div'); more.className = 'more';
      [...L.querySelectorAll(':scope > .tags, :scope > .pgl')].forEach(n => more.appendChild(n)); L.appendChild(more);
      { const pg = more.querySelector('.pgl'), rg = L.querySelector('.row .ring');   // the % ring sits right of the progress bars
        if (pg && rg) { const pr = document.createElement('div'); pr.className = 'pgrow'; pg.before(pr); pr.append(pg, rg); } }
      // the level hint folds away with them (wrapped so its height can animate)
      const lvi = $('bvLvInfo'), D = [more];
      if (lvi) { const w = document.createElement('div'); w.className = 'more lvw'; lvi.before(w); w.appendChild(lvi); D.push(w); }
      let fold = true;   // always opens folded
      const fullOf = el => { const h = el.style.height; el.style.height = 'auto'; const v = el.scrollHeight; el.style.height = h; return v; };
      let Hs = [];
      const apply = k => D.forEach((el, i) => { el.style.height = Math.max(0, Hs[i] * k) + 'px'; el.style.opacity = Math.max(0, Math.min(1, k * 1.4)); });
      const to = (open, anim = true) => {
        fold = !open; try { localStorage.setItem('atlas-bv-fold2', fold ? '1' : '0'); } catch (e) {}
        Hs = D.map(fullOf);
        D.forEach(el => { el.style.transition = anim ? 'height .32s cubic-bezier(.3,1.25,.5,1), opacity .25s' : 'none'; });
        if (open && !anim) D.forEach(el => { el.style.height = 'auto'; el.style.opacity = 1; }); else apply(open ? 1 : 0);
        card.classList.toggle('fold', fold);
        setTimeout(() => { if (!fold) D.forEach(el => { el.style.transition = 'none'; el.style.height = 'auto'; }); fitStage(); }, anim ? 340 : 0);
      };
      to(!fold, false);
      let y0 = null, k0 = 0, H = 1, last = 0, lt = 0, vy = 0, kNow = 0;
      card.addEventListener('touchstart', e => { const r = card.getBoundingClientRect(), y = e.touches[0].clientY; if (y - r.top > 110) { y0 = null; return; }
        y0 = y; Hs = D.map(fullOf); H = Hs.reduce((a, b) => a + b, 0) || 1; k0 = fold ? 0 : 1; kNow = k0; last = y; lt = performance.now(); vy = 0;
        D.forEach(el => { el.style.transition = 'none'; }); apply(k0); }, { passive: true });
      card.addEventListener('touchmove', e => { if (y0 === null) return; const y = e.touches[0].clientY, now = performance.now();
        vy = (y - last) / Math.max(1, now - lt); last = y; lt = now;
        let k = k0 + (y0 - y) / H; if (k > 1) k = 1 + (k - 1) * .25; if (k < 0) k *= .25;   // rubber band past the ends
        kNow = k; apply(k); if (Math.abs(y - y0) > 6) e.preventDefault(); }, { passive: false });
      card.addEventListener('touchend', () => { if (y0 === null) return; y0 = null;
        to(vy < -.3 ? true : vy > .3 ? false : kNow > .5); }, { passive: true });
      grab.onclick = () => to(fold);
    }
    // phones: the title needs the width — the rules button joins the end of the feature tags as a small pill
    if ($('bvRules') && matchMedia('(max-width: 819px)').matches) { const rw = $('bvi').querySelector('.row'); if (rw) { $('bvRules').classList.add('ph'); rw.appendChild($('bvRules')); } }   // phones: right of the progress ring
    if (ad && ad.levelInfo && $('bvLvInfo')) {   // how strong is this level?
      const show = () => { const n = +$('bvLv').value, x = ad.levelInfo(n, lang), max = ad.levels;
        $('bvLvInfo').innerHTML = `<span class="meter">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}" style="height:${Math.round(6 + 20 * (i + 1) / max)}px;width:${max > 12 ? 3 : 5}px"></i>`).join('')}</span><b>${esc(x.who)}</b><small>${esc(x.desc)}${x.rating ? ` · ${t('bv.rating')} ${x.rating}` : ''}</small>`; };
      $('bvLv').onchange = show; show();
      if ($('bvi').classList.contains('fold')) { const w = $('bvLvInfo').parentNode; if (w.classList.contains('lvw')) w.style.height = '0px'; }
    }
    fitStage();
    if ($('bvi').animate) $('bvi').animate([{ opacity: 0, translate: '0 36px' }, { opacity: 1, translate: '0 0' }], { duration: 380, delay: flown ? 260 : 0, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
    $('bvQuit').textContent = t('bv.quit'); $('bvClose').setAttribute('aria-label', t('bv.close'));
  }
  // in view mode the canvas only covers the area not taken by the info card (below it on phones, beside it on wide screens)
  function fitStage() {   // the board is framed above the info card (the canvas itself stays full-screen: no seams)
    if (!glOK) return;
    const card = $('bvi'), playing = $('bv').classList.contains('playing');
    if ($('bv').classList.contains('rules')) { const p = $('bv').querySelector('.rgd'); Table3D.setInset(p ? $('bv').clientHeight - p.offsetTop + 4 : 0); return; }
    Table3D.setInset(playing || !$('bv').classList.contains('on') ? 0 : innerHeight - card.getBoundingClientRect().top + 4);
    $('bv').style.setProperty('--bvcard', Math.max(0, innerHeight - card.getBoundingClientRect().top) + 'px');
  }
  addEventListener('resize', () => fitStage());
  // games that have the full portal skin open the complete game (lessons, puzzles, online …) on the 3D table
  const FULL_SKIN = { reversi: true, shogi: true, chess: true };
  function startPlay() {
    const g = bvGame, ad = Atlas3D[g.id];
    if (FULL_SKIN[g.id]) {
      const lv = $('bvLv') ? +$('bvLv').value : 0, side = $('bvSide') ? +$('bvSide').value : 1, mode = $('bvMode') ? $('bvMode').dataset.v : 'ai';
      pref[g.id + ':lv'] = lv; pref[g.id + ':side'] = side; pref[g.id + ':mode'] = mode; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (e) {}
      if (window.AtlasLoading) AtlasLoading.show(lang);   // straight to the loading screen (no camera move behind it)
      setTimeout(() => { location.href = '../' + g.href + '?skin=atlas' + (mode !== 'ai' ? '&mode=' + mode : (lv ? '&lv=' + lv : '') + '&side=' + side); }, 420);
      return;
    }
    const level = +$('bvLv').value, side = $('bvSide') ? +$('bvSide').value : 1;
    pref[g.id + ':lv'] = level; pref[g.id + ':side'] = side; try { localStorage.setItem('atlas-play', JSON.stringify(pref)); } catch (e) {}
    $('bv').classList.add('playing'); $('endc').classList.remove('on'); fitStage();
    session = ad.start({ el: $('gl'), Table3D, lang, t, level, side, hud: h => { $('hud').innerHTML = h; },
      onEnd: res => {
        A_.recordPlay(W, g.id, res); refresh();
        setTimeout(() => {
          $('endc').innerHTML = `<h3>${res.win ? '🎉 ' : ''}${esc(t(res.draw ? 'res.draw' : res.win ? 'res.win' : 'res.lose'))}</h3>${res.score ? `<div class="sc">${esc(res.score)}</div>` : ''}<div class="gnote">Lv.${res.level}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="btn ghost" id="eBack">${t('bv.quit')}</button><button class="btn" id="eAgain">${t('bv.again')}</button></div>`;
          $('endc').classList.add('on'); if (res.win) confetti(120);
          $('eAgain').onclick = () => { stopSession(); Table3D.show(g.id); setTimeout(startPlay, 50); };
          $('eBack').onclick = () => openBoard(g.id);
          welcome();
        }, 900);
      } });
    Table3D.play(true);   // after start(): the adapter puts its own board on the table
  }
  function stopSession() { if (session) { session.stop(); session = null; } $('hud').innerHTML = ''; $('bv').classList.remove('rules'); }
  // back from a game (page restored from the back-forward cache): drop the loading screen and the "playing" state,
  // so the board viewer shows its info card again instead of a bare board with only the × button
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    if (window.AtlasLoading) AtlasLoading.hide();
    if (bvGame && $('bv').classList.contains('on')) { stopSession(); openBoard(bvGame.id); }
  });
  // character-guided rules on the 3D table (atlas/rules/<id>.js)
  function startRules() {
    const g = bvGame; stopSession();
    $('bv').classList.add('playing', 'rules'); $('endc').classList.remove('on');
    session = AtlasRules[g.id].start({ el: $('gl'), Table3D, lang, panel: $('bv'),
      onStart: () => { stopSession(); startPlay(); } });
    if (session.panel && window.ResizeObserver) new ResizeObserver(fitStage).observe(session.panel);
    fitStage();
  }
  function closeBoard() { stopSession(); $('bv').classList.remove('on', 'playing'); document.body.style.overflow = ''; history.replaceState(null, '', '#' + page); render(page); }
  $('bvClose').onclick = closeBoard;
  $('bvQuit').onclick = () => openBoard(bvGame.id);
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
  (function swipe() {   // a quick horizontal flick (a slow drag still spins the board)
    let s0 = null;
    $('bv').addEventListener('pointerdown', e => { if (e.target.closest('select,button,a,input')) return; s0 = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; }, true);
    $('bv').addEventListener('pointerup', e => {
      if (!s0 || e.pointerId !== s0.id) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y, dt = performance.now() - s0.t; s0 = null;
      if (dt < 650 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) { const rtl = document.documentElement.dir === 'rtl'; stepBoard((dx < 0) !== rtl ? 1 : -1); }
    }, true);
    $('bv').addEventListener('pointercancel', () => { s0 = null; }, true);
  })();

  function renderProfile() {
    const touched = A_.GAMES.filter(g => P[g.id].touched).length, done = ACH.filter(a => a.done).length;
    const s = Math.max(1, W.login.streak || 1), pos = ((s - 1) % 7) + 1, lv = 1 + Math.floor(done / 3);
    // profile card: big avatar on its own backdrop · name · three stat tiles · the login week as a row of coin stamps
    const tile = (ic, v, of, lbl, cls = '') => `<div class="pt ${cls}"><span class="ic">${ic}</span><b>${v}${of != null ? `<small>/${of}</small>` : ''}</b><em>${esc(lbl)}</em></div>`;
    $('prof').innerHTML = `<div class="pf-l"><div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div><button class="av${W.av.frame && W.av.frame !== 'f-none' ? ' framed' : ''}" id="avBtn" aria-label="${t('pf.edit')}">${avatar(104)}<span class="lv">Lv.${lv}</span></button></div>
      <div class="pf-r"><input id="nameIn" maxlength="16" value="${esc(W.name)}" placeholder="${esc(t('pf.name'))}" aria-label="${esc(t('pf.name'))}">
      <div class="ptiles">${tile('<i class="cn">¢</i>', `<span class="coinM">${C.balance.toLocaleString()}</span>`, null, t('pf.coins'), 'coin')}${tile('🏆', done, ACH.length, t('pf.ach'))}${tile('🎲', touched, A_.GAMES.length, t('pf.games'))}</div>
      <div class="lgw"><div class="lgh"><b>🔥 ${esc(t('login.day', { n: s }))}</b><small>${esc(t('login.week'))}</small></div>
      <div class="lgd">${[1, 2, 3, 4, 5, 6, 7].map(d => `<span class="d ${d < pos ? 'got' : d === pos ? 'got now' : ''} ${d === 7 ? 'big' : ''}"><i>${d === 7 ? '🎁' : '¢'}</i><small>+${d === 7 ? 180 : 30}</small></span>`).join('')}</div></div>
      <div class="accw"></div></div>`;
    $('avBtn').onclick = () => go('dress');
    renderAcc();
    $('nameIn').onchange = e => { W.name = e.target.value.trim(); A_.save(W); if (A_.shareName) A_.shareName(W.name, true); };   // the same name in every game
  }
  /* ---------- GAMES ---------- */
  function renderGames() {
    $('hAll').textContent = t('games.h'); $('allGames').innerHTML = A_.byUpdate().map(g => gameCard(g)).join('');
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
  let achF = 'all';
  function renderAch() {
    $('hAch').textContent = t('ach.h');
    const done = ACH.filter(a => a.done).length, coins = ACH.filter(a => a.done).reduce((s, a) => s + A_.TIER_COINS[a.tier], 0);
    $('achSum').innerHTML = `<span class="coin"><i>¢</i>${coins.toLocaleString()}</span><b style="font-family:var(--round);font-size:18px">${done} / ${ACH.length}</b>
      <span class="bar" style="flex:1;min-width:120px;--c:var(--mint)"><i style="width:${done / ACH.length * 100}%"></i></span>`;
    const groups = [['all', t('ach.all'), null], ['common', t('ach.common'), null], ...A_.GAMES.map(g => [g.id, gname(g), g])];
    $('achChips').innerHTML = groups.map(([k, l, g]) => {
      const list = k === 'all' ? ACH : ACH.filter(a => (a.gid || 'common') === k);
      return `<button class="chip" aria-pressed="${achF === k}" data-k="${k}">${g ? `<img src="${artSrc(g)}" alt="" style="object-fit:contain;background:none">` : ''}${esc(l)} <em>${list.filter(a => a.done).length}/${list.length}</em></button>`;
    }).join('');
    $('achChips').querySelectorAll('.chip').forEach(b => b.onclick = () => { achF = b.dataset.k; renderAch(); });
    hscroll($('achHsc'));
    const list = (achF === 'all' ? ACH : ACH.filter(a => (a.gid || 'common') === achF)).slice()
      .sort((a, b) => (b.done - a.done) || (a.done ? 0 : (b.have / b.need) - (a.have / a.need)));
    $('achList').innerHTML = list.map(achHtml).join('');
  }

  /* ---------- SHOP ---------- */
  function renderShop() {
    $('hShop').textContent = t('shop.h'); $('shopNote').textContent = t('shop.note'); $('how1').textContent = t('how');
    $('shopItems').innerHTML = A_.shop(W).map(({ id, price }) => {
      const it = ART.byId(id), own = W.owned.includes(id);
      const foot = own ? `<span class="btn sm ghost" aria-disabled="true">${t('shop.owned')}</span>` : `<button class="btn sm sun" data-buy="${id}" data-p="${price}" ${C.balance < price ? 'disabled' : ''}><span class="price"><i></i>${price}</span></button>`;
      return itemCard(it, foot);
    }).join('');
    $('shopItems').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const id = b.dataset.buy, p = +b.dataset.p;
      if (C.balance < p) return toast(t('shop.short'));
      if (A_.buy(W, id, p)) { refresh(); bumpCoins(); toast(t('shop.bought', { name: iname(ART.byId(id)) })); confetti(60); renderShop(); }
    });
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
      <p class="gfoot">★ ${t('g.dup')}</p>`;
    $('gDress').onclick = () => go('dress');
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
    busy = false; renderGacha();
    if (!done) return;
    if (n === 1) {
      const a = g.actions(`<button class="btn ghost" id="gClose1">${t('g.close')}</button><button class="btn sky" id="gAgain1" ${C.balance < cost ? 'disabled' : ''}>${t('g.again')}</button>`);
      a.querySelector('#gClose1').onclick = () => g.reset();
      a.querySelector('#gAgain1').onclick = () => doPull(1);
    } else if (page === 'gacha') resultSheet(res, n, cost, true, () => g.reset());
    else g.reset();
  }

  /* ---------- DRESS ---------- */
  let dKind = 'icon';
  function renderDress() {
    $('hDress').textContent = t('dress.h');
    $('dprev').classList.toggle('dark', ART.isDark(W.av.bg));
    $('dprev').innerHTML = `<div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div><button class="av poke" aria-label="${esc(iname(ART.byId(W.av.icon) || ART.byId(ART.DEFAULT_ICON)))}" style="background:none;box-shadow:none">${ART.avatar(W.av, 150, { pop: true })}</button>
      <div style="text-align:center"><b style="font-size:20px">${esc(W.name || t('pf.player'))}</b><div class="gnote">${t('dress.got', { n: W.owned.length, m: ART.items.length })}</div></div>`;
    $('dseg').innerHTML = ['icon', 'bg', 'frame'].map(k => `<button aria-pressed="${dKind === k}" data-k="${k}">${t('kind.' + k)}</button>`).join('');
    $('dseg').querySelectorAll('button').forEach(b => b.onclick = () => { dKind = b.dataset.k; renderDress(); });
    const slot = dKind;
    const list = ART.items.filter(it => it.kind === dKind).sort((a, b) => (W.owned.includes(b.id) - W.owned.includes(a.id)) || a.rar - b.rar);
    $('dItems').innerHTML = list.map(it => {
      const own = W.owned.includes(it.id), on = W.av[slot] === it.id;
      return itemCard(it, own ? (on ? `<span class="btn sm mint">${t('dress.on')}</span>` : `<button class="btn sm sky" data-wear="${it.id}">${t('dress.wear')}</button>`) : '', (own ? '' : 'locked ') + (on ? 'sel' : ''));
    }).join('');
    $('dItems').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { W.av[slot] = b.dataset.wear; A_.save(W); renderDress(); if (slot === 'icon') pokeAvatar(true); });
    $('dprev').querySelector('.poke').onclick = () => pokeAvatar();
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
  function confetti(n) {
    const cv = $('confetti'), g = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#ff5d5d', '#ffc928', '#3ccf91', '#36b4ff', '#8d6bff', '#ff7fbe'];
    const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .45, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, s: 6 + Math.random() * 6, c: cols[Math.random() * 6 | 0] }));
    let f = 0;
    (function step() {
      g.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .45; p.vx *= .99; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (++f < 120) requestAnimationFrame(step); else g.clearRect(0, 0, cv.width, cv.height);
    })();
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
      flyCoins(src, from, C.balance, () => { refresh(); if (page === 'home') renderProfile(); after && after(); });
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
    setTimeout(() => { if (!taken) confetti(40); }, 420);
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
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const title = t('title');
    $('wm').innerHTML = lang === 'en' || /[^\x00-\x7f]/.test(title) === false ? [...title].map(c => `<span>${esc(c)}</span>`).join('') : esc(title);
    if (lang === 'ja') $('wm').innerHTML = [...title].map(c => `<span>${esc(c)}</span>`).join('');
    $('wmSub').textContent = t('sub');
    document.title = title + ' — ' + (lang === 'en' ? '世界のボドゲ大全' : 'World Board Game Atlas');
    $('langSel').value = lang; $('langCode').textContent = lang.toUpperCase();
    $('homeBtn').setAttribute('aria-label', t('back')); $('footBack').textContent = t('back');
    tabsEl.querySelectorAll('.tab').forEach(b => { b.querySelector('span').textContent = t('tab.' + b.dataset.k); });
  }
  // game-styled language picker (the native <select> stays as the source of the options)
  const LNAME = { ja: 'Japanese', en: 'English', zh: 'Chinese', ko: 'Korean', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', hi: 'Hindi', ar: 'Arabic' };
  function openLang(on) {
    const pop = $('langPop'), btn = $('langBtn');
    if (on === undefined) on = pop.hidden;
    if (on) pop.innerHTML = [...$('langSel').options].map(o => `<button type="button" role="option" data-l="${o.value}" aria-selected="${o.value === lang}"><b>${esc(o.text)}</b><small>${o.value.toUpperCase()} · ${LNAME[o.value]}</small></button>`).join('');
    pop.hidden = !on; btn.setAttribute('aria-expanded', on);
    pop.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { openLang(false); if (b.dataset.l !== lang) { $('langSel').value = b.dataset.l; $('langSel').dispatchEvent(new Event('change')); } });
  }
  $('langBtn').onclick = e => { e.stopPropagation(); openLang(); };
  document.addEventListener('click', e => { if (!$('langPop').hidden && !$('langPop').contains(e.target)) openLang(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('langPop').hidden) openLang(false); });
  $('langSel').onchange = e => { lang = e.target.value; try { localStorage.setItem('aicoding-lang', lang); } catch (x) {} applyLang(); render(page); };

  function render(k) {
    sfxIcon();
    if (k === 'home') renderHome(); else if (k === 'games') renderGames(); else if (k === 'ach') renderAch();
    else if (k === 'shop') renderShop(); else if (k === 'gacha') renderGacha(); else if (k === 'dress') renderDress();
  }
  // progress may change in another tab (a game) — re-read when coming back
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !session) { W = A_.load(); refresh(); render(page); welcome(); } });
  /* ---------- idle: pause CSS/SVG animations while the tab is hidden or the window isn't focused ---------- */
  (function idle() {
    const st = document.createElement('style'); st.textContent = 'html.atlas-idle *,html.atlas-idle *::before,html.atlas-idle *::after{animation-play-state:paused!important}'; document.head.appendChild(st);
    const set = () => { const on = document.hidden || !document.hasFocus(); document.documentElement.classList.toggle('atlas-idle', on); document.querySelectorAll('svg').forEach(s => { try { on ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} }); };
    document.addEventListener('visibilitychange', set); addEventListener('blur', set); addEventListener('focus', set);
  })();

  applyLang(); refresh();
  const [h0, h1] = (location.hash || '#home').slice(1).split('/');
  go(h0, false);
  history.replaceState(null, '', '#' + page);
  if (h1) openBoard(h1);
  welcome();
})();
