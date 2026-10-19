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
  const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString(lang, { month: 'short', day: 'numeric' }); } catch (e) { return d; } };

  /* ---------- state ---------- */
  let W = A_.load(), P = A_.allProgress(), ACH = A_.achievements(P, W), C = A_.coins(W, ACH);
  function refresh() { P = A_.allProgress(); ACH = A_.achievements(P, W); C = A_.coins(W, ACH); $('coinN').textContent = C.balance.toLocaleString(); }

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
  const R3 = new Set(['reversi', 'shogi', 'chess', 'gomoku', 'dots', 'connect4', 'mancala', 'backgammon', 'morris', 'sudoku']);   // images/atlas/<id>.webp exists
  const artSrc = g => R3.has(g.id) ? `../images/atlas/${g.id}.webp?v=2` : `../${g.icon}`;
  const artImg = (g, extra = '') => `<img src="${artSrc(g)}" alt="" loading="lazy" decoding="async"${R3.has(g.id) ? '' : ' class="flat"'}${extra}>`;
  const g3 = g => `<span class="g3" style="--c:${g.color}">${artImg(g)}</span>`;
  const gno = g => 'No.' + String(A_.GAMES.indexOf(g) + 1).padStart(2, '0');
  function tagHtml(k) { const T = A_.TAGS[k]; return `<span class="tag" style="--c:${T.c}"><svg viewBox="0 0 24 24"><path d="${T.i}"/></svg>${esc(t('tag.' + k))}</span>`; }
  function badgeHtml(b) { return `<span class="badge ${b}">${{ new: 'NEW', update: 'UPDATE', beta: 'BETA', premium: 'PREMIUM' }[b]}</span>`; }
  function ring(pct, col) {
    const r = 22, c = 2 * Math.PI * r;
    return `<span class="ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#efe8d6" stroke-width="6"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * pct / 100} ${c}"/></svg>${pct}%</span>`;
  }
  function gameCard(g, withUpd) {
    const r = P[g.id], u = A_.UPDATES.find(x => x[1] === g.id);
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
      ${withUpd && u ? `<div class="upd"><time>${fmtDate(u[0])}</time>${esc(lang === 'ja' ? u[2] : u[3])}</div>` : ''}
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
    const host = document.querySelector('#prof .stats'); if (!host || !window.AtlasAccount) return;
    let el = document.getElementById('acc'); if (!el) { el = document.createElement('div'); el.id = 'acc'; el.className = 'acc'; host.after(el); }
    const s = AtlasAccount.state();
    if (!s.available) { el.innerHTML = `<span>🔒 ${t('acc.soon')}</span>`; el.title = t('acc.note'); return; }
    if (!s.user) { el.innerHTML = `<button class="gbtn" id="accIn">${GLOGO}${t('acc.in')}</button><span>${t('acc.note')}</span>`; $('accIn').onclick = () => AtlasAccount.signIn(); return; }
    const when = s.last ? new Date(s.last).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '';
    el.innerHTML = `${s.user.photo ? `<img src="${esc(s.user.photo)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(s.user.email || s.user.name)}</span>
      <span class="${s.err ? '' : 'ok'}">${s.syncing ? t('acc.syncing') : s.err ? t('acc.err') : '✓ ' + t('acc.synced') + ' ' + when}</span><button class="btn sm ghost" id="accOut">${t('acc.out')}</button>`;
    $('accOut').onclick = () => AtlasAccount.signOut();
  }
  if (window.AtlasAccount) {
    AtlasAccount.on(() => renderAcc());
    window.addEventListener('atlas-synced', () => { W = A_.load(); refresh(); if (!session) render(page); });
    // when the name changes, fill it in from Google if empty
    AtlasAccount.on(st => { if (st.user && !W.name && st.user.name) { W.name = st.user.name.slice(0, 16); A_.save(W); const ni = $('nameIn'); if (ni) ni.value = W.name; } });
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
    (function step(now) {
      propRaf = requestAnimationFrame(step);
      if (document.hidden || page !== 'home' || !els[0] || !els[0].isConnected) return;
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
  (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => { if (!glOK) initGL(); });
  function renderHome() {
    renderHero();
    $('hUpd').textContent = t('upd.h'); $('hIcons').textContent = t('upd.games');
    const seen = new Set(), ups = A_.UPDATES.filter(u => !seen.has(u[1]) && seen.add(u[1]));
    $('updRow').innerHTML = ups.map(u => { const g = A_.GAMES.find(x => x.id === u[1]);
      return `<button class="ut" data-g="${g.id}" style="--c:${g.color}"><span class="pan"><span class="new">${A_.badges(g).slice(0, 1).map(badgeHtml).join('')}</span><span class="dt">${fmtDate(u[0])}</span>${artImg(g)}</span>
        <span class="tx"><b>${esc(gname(g))}</b><p>${esc(lang === 'ja' ? u[2] : u[3])}</p></span></button>`; }).join('');
    $('iconGrid').innerHTML = A_.byUpdate().map(g => { const b = A_.badges(g).filter(x => x !== 'premium')[0];
      return `<button class="ic" data-g="${g.id}" style="--c:${g.color}"><span class="art"><span class="no">${gno(g)}</span>${artImg(g)}</span>${b ? `<span class="bdg">${badgeHtml(b)}</span>` : ''}
        <span class="lab"><span class="n">${esc(gname(g))}</span><span class="pr"><i style="width:${P[g.id].pct}%"></i></span></span></button>`; }).join('');
    document.querySelectorAll('#updRow [data-g], #iconGrid [data-g]').forEach(b => { b.onclick = () => flyOpen(b.dataset.g, b.querySelector('img')); });
    renderProfile();
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
    if (!img || !img.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return openBoard(id);
    flying = true; initGL();
    const r = img.getBoundingClientRect(), W = innerWidth, H = innerHeight, wide = W > 900 && W / H > 1.25;
    const cx = wide ? W * .62 : W / 2, cy = wide ? H / 2 : H * .3;
    const fly = img.cloneNode(); fly.removeAttribute('loading'); fly.removeAttribute('class');
    Object.assign(fly.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, zIndex: 90, pointerEvents: 'none', objectFit: 'contain', filter: 'drop-shadow(0 14px 12px rgba(0,0,0,.25))', transform: 'none', right: 'auto', bottom: 'auto', transformOrigin: '50% 60%' });
    document.body.appendChild(fly); img.style.visibility = 'hidden';
    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2), sc = Math.min(W * .5, 260) / Math.max(r.width, 1);
    // anticipation squash → leap with stretch → arrive
    fly.animate([
      { transform: 'translate(0,0) scale(1,1)' },
      { transform: 'translate(0,6px) scale(1.14,.82)', offset: .2 },
      { transform: `translate(${dx * .5}px, ${dy * .5 - 70}px) scale(${sc * .55},${sc * .7}) rotate(-12deg)`, offset: .62 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sc},${sc}) rotate(0deg)` },
    ], { duration: 300, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
    requestAnimationFrame(() => setTimeout(() => warm(id), 0));
    setTimeout(() => {
      openBoard(id, true, true);
      setTimeout(() => { fly.remove(); img.style.visibility = ''; flying = false; }, 90);
    }, 290);
  }
  // star burst at the board when the icon turns into it
  function burst() {
    const gl = $('gl').getBoundingClientRect(), b = document.createElement('div');
    b.className = 'burst'; b.style.left = (gl.left + gl.width / 2) + 'px'; b.style.top = (gl.top + gl.height * .5) + 'px';
    b.innerHTML = '<i></i>' + Array.from({ length: 10 }, (_, i) => `<b style="--a:${i * 36}deg"></b>`).join('');
    $('bv').appendChild(b); setTimeout(() => b.remove(), 600);
  }
  function openBoard(id, push = true, flown = false) {
    const g = A_.GAMES.find(x => x.id === id); if (!g) return;
    bvGame = g; stopSession();
    $('bv').classList.add('on'); $('bv').classList.remove('playing'); $('endc').classList.remove('on');
    document.body.style.overflow = 'hidden';
    if (push) history.replaceState(null, '', '#' + page + '/' + id);
    if (initGL()) {
      const can = flown && window.Icons3D && Icons3D.ICONS[id];
      Table3D.show(id, null, can ? { introFromCache: true, intro: null, introScale: 1.9, onSwap: burst } : {});
      Table3D.play(false);
    }
    else $('gl').innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center"><img src="${artSrc(g)}" alt="" style="width:min(70vw,420px)"></div>`;
    const ad = glOK && window.Atlas3D && Atlas3D[id], r = P[id];
    const rows = [];
    if (g.total.pz) rows.push([t('pg.pz'), r.pz || 0, g.total.pz]);
    if (g.total.ls) rows.push([t('pg.ls'), r.ls || 0, g.total.ls]);
    const lv = pref[id + ':lv'] || Math.min(4, ad ? ad.levels : 4), side = pref[id + ':side'] || 1;
    $('bvi').innerHTML = `<div class="row">${g3(g)}<div style="min-width:0;flex:1"><h3>${esc(gname(g))}</h3><div class="bd">${A_.badges(g).map(badgeHtml).join('')}</div></div>${ring(r.pct, g.color)}</div>
      <div class="tags">${g.tags.filter(k => k !== 'mobile').map(tagHtml).join('')}</div>
      ${rows.length ? `<div class="pgl">${rows.map(([l, a, b]) => `<span>${l}</span><span class="bar" style="--c:${g.color}"><i style="width:${Math.min(100, a / b * 100)}%"></i></span><b>${Math.min(a, b)}/${b}</b>`).join('')}</div>` : ''}
      ${ad ? `<div class="opts"><label>${t('bv.level')}<select id="bvLv">${Array.from({ length: ad.levels }, (_, i) => `<option value="${i + 1}" ${i + 1 === lv ? 'selected' : ''}>Lv.${i + 1}</option>`).join('')}</select></label>
        ${ad.sides ? `<label>${t('bv.side')}<select id="bvSide"><option value="1" ${side === 1 ? 'selected' : ''}>${t('bv.first')}</option><option value="2" ${side === 2 ? 'selected' : ''}>${t('bv.second')}</option></select></label>` : ''}</div>` : `<div class="soon">${g.id === 'sudoku' ? '' : t('bv.soon')}</div>`}
      <div class="act">${ad ? `<button class="btn big" id="bvStart">${t('bv.start')} ▶</button><a class="btn ghost sm" href="../${g.href}">${t('bv.classic')}</a>` : `<a class="btn big" href="../${g.href}">${t('play')} ▶</a>`}</div>`;
    if (ad) $('bvStart').onclick = startPlay;
    fitStage();
    if ($('bvi').animate) $('bvi').animate([{ opacity: 0, translate: '0 36px' }, { opacity: 1, translate: '0 0' }], { duration: 380, delay: flown ? 520 : 0, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
    $('dhint').querySelector('span').textContent = t('drag');
    $('bvQuit').textContent = t('bv.quit'); $('bvClose').setAttribute('aria-label', t('bv.close'));
  }
  // in view mode the canvas only covers the area not taken by the info card (below it on phones, beside it on wide screens)
  function fitStage() {
    const gl = $('gl'), card = $('bvi'), playing = $('bv').classList.contains('playing');
    gl.style.top = gl.style.bottom = gl.style.left = gl.style.right = '';
    if (playing || !$('bv').classList.contains('on')) return;
    const r = card.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    if (r.left > 40 || r.width < W * .6) { if (document.dir === 'rtl') gl.style.right = (W - r.left + 10) + 'px'; else gl.style.left = (r.right + 10) + 'px'; }
    else gl.style.bottom = (H - r.top + 4) + 'px';
  }
  addEventListener('resize', () => fitStage());
  function startPlay() {
    const g = bvGame, ad = Atlas3D[g.id];
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
  function stopSession() { if (session) { session.stop(); session = null; } $('hud').innerHTML = ''; }
  function closeBoard() { stopSession(); $('bv').classList.remove('on', 'playing'); document.body.style.overflow = ''; history.replaceState(null, '', '#' + page); render(page); }
  $('bvClose').onclick = closeBoard;
  $('bvQuit').onclick = () => openBoard(bvGame.id);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('bv').classList.contains('on') && !$('ov').classList.contains('on')) closeBoard(); });

  function renderProfile() {
    const touched = A_.GAMES.filter(g => P[g.id].touched).length, done = ACH.filter(a => a.done).length;
    $('prof').innerHTML = `<div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div>
      <button class="av" id="avBtn" aria-label="${t('pf.edit')}">${avatar(92)}</button>
      <div style="flex:1;min-width:0"><input id="nameIn" maxlength="16" value="${esc(W.name)}" placeholder="${esc(t('pf.name'))}" aria-label="${esc(t('pf.name'))}">
      <div class="stats"><div class="stat"><b>${C.balance.toLocaleString()}</b><span>${t('pf.coins')}</span></div><div class="stat"><b>${done}<small style="font-size:12px;color:var(--ink2)">/${ACH.length}</small></b><span>${t('pf.ach')}</span></div><div class="stat"><b>${touched}<small style="font-size:12px;color:var(--ink2)">/${A_.GAMES.length}</small></b><span>${t('pf.games')}</span></div></div></div>`;
    $('avBtn').onclick = () => go('dress');
    renderAcc();
    $('nameIn').onchange = e => { W.name = e.target.value.trim(); A_.save(W); };
    const s = W.login.streak, pos = ((s - 1) % 7) + 1;
    $('login').innerHTML = `<div class="h3"><span>${t('login.h')}</span><span class="coin" style="font-size:14px"><i>¢</i>+${A_.TIER_COINS ? 30 : 30}</span></div>
      <div class="week">${[1, 2, 3, 4, 5, 6, 7].map(d => `<div class="${d <= pos ? 'on' : ''} ${d === 7 ? 'big' : ''}">${d === 7 ? '+150' : d}</div>`).join('')}</div>
      <small>${t('login.day', { n: s })} · ${t('login.week')}</small>`;
  }
  /* ---------- GAMES ---------- */
  function renderGames() {
    $('hAll').textContent = t('games.h'); $('allGames').innerHTML = A_.byUpdate().map(g => gameCard(g, true)).join('');
    $('allGames').querySelectorAll('[data-open]').forEach(a => a.onclick = e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openBoard(a.dataset.open); });
  }

  /* ---------- ACHIEVEMENTS ---------- */
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
  function renderGacha() {
    $('machine').innerHTML = MACHINE;
    const R = A_.GACHA;
    $('gpanel').innerHTML = `<h3>${t('g.h')}</h3>
      <div class="gbtns"><button class="btn sky" id="g1" ${C.balance < R.one ? 'disabled' : ''}>${t('g.one')}<small><span class="price"><i></i>${R.one}</span></small></button>
      <button class="btn" id="g10" ${C.balance < R.ten ? 'disabled' : ''}>${t('g.ten')}<small><span class="price"><i></i>${R.ten}</span></small></button></div>
      <div class="gnote">★ ${t('g.tenNote')}<br>★ ${t('g.dup')}</div>
      <div><div class="gnote" style="margin-bottom:6px">${t('g.rates')}</div><div class="rates">${R.rates.map((p, i) => `<span class="r${i}" style="${i === 4 ? 'background:linear-gradient(135deg,#ff7fbe,#ffb21e)' : ''}">${ART.RAR[i]} ${(p * 100).toFixed(1)}%</span>`).join('')}</div></div>
      <div class="gnote">${t('dress.got', { n: W.owned.length, m: ART.items.length })}</div>`;
    $('g1').onclick = () => doPull(1); $('g10').onclick = () => doPull(10);
  }
  let busy = false;
  function doPull(n) {
    const cost = n === 10 ? A_.GACHA.ten : A_.GACHA.one;
    if (busy || C.balance < cost) return toast(t('shop.short'));
    busy = true;
    const res = A_.pull(W, n); refresh(); bumpCoins();
    const m = $('machine'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
    const k = $('knob'); if (k) k.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      busy = false;
      openSheet(`<h3>${t('g.h')}</h3><div class="res ${n === 1 ? 'one' : ''}">${res.map((r, i) => {
        const it = ART.byId(r.id);
        return `<button class="cap c${r.rar}" data-i="${i}" aria-label="${t('g.tap')}"><span class="in"><span class="f"></span><span class="b">${r.dup ? `<span class="dp">¢${t('g.refund', { n: r.refund })}</span>` : `<span class="nw">${t('g.new')}</span>`}${ART.svg(r.id, 80)}<span class="rr">${ART.RAR[r.rar]}</span><span class="n">${esc(iname(it))}</span></span></span></button>`;
      }).join('')}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn ghost" id="gClose">${t('g.close')}</button><button class="btn sky" id="gAgain" ${C.balance < cost ? 'disabled' : ''}>${t('g.again')}</button></div>`);
      const caps = [...document.querySelectorAll('.cap')];
      caps.forEach(c => c.onclick = () => openCap(c));
      caps.forEach((c, i) => setTimeout(() => openCap(c), 350 + i * 170));
      $('gClose').onclick = closeSheet;
      $('gAgain').onclick = () => { closeSheet(); doPull(n); };
      renderGacha();
    }, 700);
    function openCap(c) { if (c.classList.contains('open')) return; c.classList.add('open'); const r = res[+c.dataset.i]; if (r.rar >= 3) confetti(r.rar === 4 ? 160 : 70); }
  }

  /* ---------- DRESS ---------- */
  let dKind = 'icon';
  function renderDress() {
    $('hDress').textContent = t('dress.h');
    $('dprev').innerHTML = `<div class="bgfill" style="background:${ART.bgDataUri(W.av.bg)}"></div><div class="av" style="background:none;box-shadow:none">${avatar(150)}</div>
      <div style="text-align:center"><b style="font-size:20px">${esc(W.name || t('pf.player'))}</b><div class="gnote">${t('dress.got', { n: W.owned.length, m: ART.items.length })}</div></div>`;
    $('dseg').innerHTML = ['icon', 'bg', 'frame'].map(k => `<button aria-pressed="${dKind === k}" data-k="${k}">${t('kind.' + k)}</button>`).join('');
    $('dseg').querySelectorAll('button').forEach(b => b.onclick = () => { dKind = b.dataset.k; renderDress(); });
    const slot = dKind;
    const list = ART.items.filter(it => it.kind === dKind).sort((a, b) => (W.owned.includes(b.id) - W.owned.includes(a.id)) || a.rar - b.rar);
    $('dItems').innerHTML = list.map(it => {
      const own = W.owned.includes(it.id), on = W.av[slot] === it.id;
      return itemCard(it, own ? (on ? `<span class="btn sm mint">${t('dress.on')}</span>` : `<button class="btn sm sky" data-wear="${it.id}">${t('dress.wear')}</button>`) : '', (own ? '' : 'locked ') + (on ? 'sel' : ''));
    }).join('');
    $('dItems').querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { W.av[slot] = b.dataset.wear; A_.save(W); renderDress(); });
  }

  /* ---------- overlay / toast / confetti ---------- */
  function openSheet(html) { $('sheet').innerHTML = html; $('ov').classList.add('on'); }
  function closeSheet() { $('ov').classList.remove('on'); }
  $('ov').addEventListener('click', e => { if (e.target === $('ov')) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('ov').classList.contains('on')) closeSheet(); });
  let toastT = 0;
  function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2200); }
  function bumpCoins() { const p = $('coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  function confetti(n) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

  /* ---------- welcome: login bonus + new achievements ---------- */
  function welcome() {
    const lb = A_.claimLogin(W);
    const fresh = ACH.filter(a => a.done && !W.seen[a.id]);
    refresh();
    if (!lb && !fresh.length) return;
    const total = (lb ? lb.amt : 0) + fresh.reduce((s, a) => s + A_.TIER_COINS[a.tier], 0);
    const show = fresh.slice(0, 6);
    openSheet(`${lb ? `<h3>${t('login.h')}</h3><p style="font-weight:900;margin:-6px 0 12px">${t('login.day', { n: lb.streak })}</p>` : ''}
      ${fresh.length ? `<h3>${t('ach.got')}</h3><div class="newach">${show.map(achHtml).join('')}${fresh.length > show.length ? `<div class="gnote" style="text-align:center">+${fresh.length - show.length}</div>` : ''}</div>` : ''}
      <div class="total"><i></i>+${total.toLocaleString()}</div><button class="btn sun" id="take">${t('ach.take')}</button>`);
    $('take').onclick = () => { fresh.forEach(a => { W.seen[a.id] = 1; }); A_.save(W); closeSheet(); bumpCoins(); confetti(90); render(page); };
    if (fresh.length) confetti(70);
  }

  /* ---------- language apply ---------- */
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const title = t('title');
    $('wm').innerHTML = lang === 'en' || /[^\x00-\x7f]/.test(title) === false ? [...title].map(c => `<span>${esc(c)}</span>`).join('') : esc(title);
    if (lang === 'ja') $('wm').innerHTML = [...title].map(c => `<span>${esc(c)}</span>`).join('');
    $('wmSub').textContent = t('sub');
    document.title = title + ' — ' + (lang === 'en' ? '世界のボドゲ大全' : 'World Board Game Atlas');
    $('langSel').value = lang;
    $('homeBtn').setAttribute('aria-label', t('back')); $('footBack').textContent = t('back');
    tabsEl.querySelectorAll('.tab').forEach(b => { b.querySelector('span').textContent = t('tab.' + b.dataset.k); });
  }
  $('langSel').onchange = e => { lang = e.target.value; try { localStorage.setItem('aicoding-lang', lang); } catch (x) {} applyLang(); render(page); };

  function render(k) {
    if (k === 'home') renderHome(); else if (k === 'games') renderGames(); else if (k === 'ach') renderAch();
    else if (k === 'shop') renderShop(); else if (k === 'gacha') renderGacha(); else if (k === 'dress') renderDress();
  }
  // progress may change in another tab (a game) — re-read when coming back
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !session) { W = A_.load(); refresh(); render(page); welcome(); } });

  applyLang(); refresh();
  const [h0, h1] = (location.hash || '#home').slice(1).split('/');
  go(h0, false);
  history.replaceState(null, '', '#' + page);
  if (h1) openBoard(h1);
  welcome();
})();
