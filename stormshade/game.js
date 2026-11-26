/* 嵐影館 STORMSHADE — 画面と進行
   幕の流れ：タイトル → 事件をえらぶ → むずかしさと役 → 序幕（晩餐・ハンドアウト）→ 朝（遺体）
            →（昼：調べる・話を聞く → 夕：話し合い）× 2日 → 三日目：解答 → 真相と採点
   事件の中身はすべて engine.js（くじと推理）と cases/（文章）が決める。ここは見せ方だけ。
   舞台・文字の帯・札（シート）の仕組みは、狼影灯（lampblack/game.js）から写したもの。 */
(function () {
  'use strict';
  const E = window.SSEngine, ART = window.WLArt, SND = window.WLSound;
  const $ = id => document.getElementById(id);
  const PCQ = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)');
  const KEY = 'stormshade-save-v1', REC = 'stormshade-rec-v1', PREF = 'stormshade-pref-v1';
  const CASES = ['karasuba'];
  const DIFFT = ['手がかりが多く、手帳が痕跡に合う特徴を教えてくれる。', '嘘をつく者が増える。展開がひとつ。', '謎が三つ。犯人は、ときに誰かに罪を着せる。', '展開がふたつ。嘘つきは一度は言い張る。物は罠になる。', '痕跡はわずか。誰の言葉も信じきれない。'];
  const IC = {
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
    talk: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    clash: '<svg viewBox="0 0 24 24"><path d="M5 5l6 6M19 5l-6 6M12 13v7M8 20h8"/><path d="M4 4l2 0 0 2M20 4h-2v2"/></svg>',
    show: '<svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>',
    ask: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M10.2 8.6a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4M12 13.6v.1"/></svg>',
  };
  const ROLE_ICON = { auto: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11"/><path d="M12.5 12.5a3.6 3.6 0 1 1 4.8 3.4c-.9.4-1.3 1.1-1.3 2.1v.6M16 22.5v.2"/></svg>' };

  let pref = { speed: 2, anim: true, names: true };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch (e) {}
  const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch (e) {} };
  let st = null, S = null;
  const G = { scr: 'title', caseId: 'karasuba', diff: 1, role: 'auto', q: [], typing: null, loc: 'hall', nbTab: 'ppl' };

  /* ---------- helpers ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fill = (t, o) => E.fill(t, o);
  const ch = id => id === 'soichiro' || (st && st.victim && id === st.victim.id) ? st.victim : st.chars.find(c => c.id === id);
  const nm = id => id === 'you' ? 'あなた' : (ch(id) || {}).name || id;
  const sn = id => id === S.pc ? 'あなた' : (ch(id) || {}).short || nm(id);   // the short name, or あなた for your own role
  const locName = id => E.locName(st, id);
  const slotName = s => st.slots[s];
  const npcs = () => st.chars.map(c => c.id).filter(id => id !== S.pc);
  const alive = () => npcs().filter(id => S.people[id].alive);
  const D = () => E.DIFF[S.diff];
  const wait = ms => new Promise(r => setTimeout(r, pref.anim ? ms : Math.min(ms, 80)));
  function bust(id) { if (id === 'you') return '<svg class="bust" viewBox="30 0 66 76"><circle cx="60" cy="40" r="16" fill="currentColor" opacity=".18"/><path d="M42 74c2-10 10-14 18-14s16 4 18 14" fill="currentColor" opacity=".18"/></svg>'; const c = ch(id); return c ? ART.bust(c.look, c.color) : ''; }
  function save() { if (!S) return; try { localStorage.setItem(KEY, JSON.stringify({ S, ui: { loc: G.loc } })); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function loadSave() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function rec() { try { return JSON.parse(localStorage.getItem(REC) || '{}'); } catch (e) { return {}; } }
  // how each person ends a sentence: 「いた」「おりました」…
  const TONE = {
    toru: { was: 'いた', saw: '見かけた', none: '誰も見ていない', sleep: '部屋で寝ていた', deny: '見間違いだろう。僕はそこにはいなかった。', crime: '……ああ、そこにいたよ。でも、爺さんを殺してはいない。' },
    ayano: { was: 'おりました', saw: '見かけました', none: '誰もお見かけしませんでした', sleep: '部屋で休んでおりました', deny: 'お見間違いでしょう。私はそこにはおりませんでした。', crime: '……ええ、おりました。けれど、殺してはおりません。' },
    maki: { was: 'いました', saw: '見かけました', none: '誰も見ていません', sleep: '部屋で寝ていました', deny: '見間違いです。僕はそこにはいなかった。それは、はっきり申し上げられます。', crime: '……そこにいたことは認めます。ですが、殺してはいない。' },
    chihaya: { was: 'いたよ', saw: '見たよ', none: '誰も見てないね', sleep: '部屋で寝てたよ', deny: '見間違いだね。あたしはそこにはいなかった。', crime: '……いたよ、そこに。でも、殺してない。それだけは書き残しておいて。' },
    tobari: { was: 'おりました', saw: 'お見かけいたしました', none: 'どなたもお見かけしておりません', sleep: '部屋で休ませていただいておりました', deny: '恐れながら、お見間違いかと存じます。手前は、そこにはおりませんでした。', crime: '……おりました。しかし、旦那さまに手をかけてはおりません。' },
    suzu: { was: 'いました', saw: '見かけました', none: '誰も見てません', sleep: '部屋で寝てました', deny: 'ち、違います！ あたし、そこにはいませんでした！', crime: '……いました。でも、殺してなんかいません！' },
    saeko: { was: 'おりましたわ', saw: 'お見かけしましたわ', none: 'どなたもお見かけしませんでしたわ', sleep: '部屋で休んでおりましたわ', deny: 'お見間違いではなくて？ わたくし、そこにはおりませんでしたわ。', crime: '……ええ、おりましたわ。でも、あの人を殺したのは、わたくしではありませんことよ。' },
    kyosuke: { was: 'いた', saw: '見た', none: '誰も見ちゃいねえ', sleep: '部屋で寝てた', deny: '見間違いだろうが。俺はそこにはいなかった。', crime: '……いたよ。だが、親父を殺しちゃいねえ。' },
  };
  const tone = id => TONE[id] || TONE.maki;
  /* ---------- the stage ---------- */
  let sceneKey = null;
  function setScene(loc, night, crowd) {
    document.body.classList.toggle('crowd', !!crowd);
    const k = 'm:' + loc;
    document.body.classList.toggle('night', !!night);
    if (k === sceneKey) return;
    sceneKey = k;
    const el = $('scene');
    el.classList.add('swap'); $('floor').classList.add('swap');
    setTimeout(() => { el.innerHTML = SSArt.scene(loc, 1); el.classList.remove('swap'); G.floorLoc = loc; drawFloor(); $('floor').classList.remove('swap'); }, pref.anim ? 260 : 0);
  }
  /* the stage floor, cut from paper and drawn for the real size (nothing stretches): what the way is made of, what lies beside it, what stands along it — one for each place, so it changes with the backdrop */
  const FLOOR = {
    front: ['dirt', 'grass', 'rock'], pier: ['plank', 'water', 'post'], hall: ['board', 0, 'col'], study: ['aisle', 0, 0], library: ['board', 0, 0], dining: ['aisle', 0, 0],
    conserv: ['flag', 'grass', 'tuft'], chapel: ['aisle', 0, 'col'], cellar: ['flag', 0, 'barrel'], tower: ['board', 0, 'crate'], rooms: ['aisle', 0, 0],
  };
  function drawFloor() {
    const f = $('floor'); if (!f) return;
    if (!f.__l) { f.__l = 1; f.addEventListener('transitionend', e => { if (e.propertyName === 'top') drawFloor(); }); }
    const w = Math.round(f.clientWidth), h = Math.round(f.clientHeight), key = w + 'x' + h + ':' + G.floorLoc;
    if (!w || !h || f.__wh === key) return; f.__wh = key;
    const [way, side, prop] = FLOOR[G.floorLoc] || ['dirt', 'grass', 'tuft'];
    let sd = 7 + (G.floorLoc || '').length * 131; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const n0 = v => v.toFixed(0), cx = w / 2, hw = y => w * .11 + w * .62 * Math.pow(y / h, 1.15), X = (u, y) => cx + u * hw(y);
    const rowY = (j, n) => h * Math.pow(j / n, 1.6);
    const quad = (u0, u1, y0, y1, g) => `M${n0(X(u0, y0) + g)},${n0(y0 + g * .4)} L${n0(X(u1, y0) - g)},${n0(y0 + g * .4)} L${n0(X(u1, y1) - g)},${n0(y1 - g * .4)} L${n0(X(u0, y1) + g)},${n0(y1 - g * .4)} Z`;
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) { const y = h * i / 14, j = (r() - .5) * w * .012 * (1 + i / 6); L.push([X(-1, y) + j, y]); R.push([X(1, y) - j, y]); }
    const road = L.concat(R.slice().reverse()).map(p => n0(p[0]) + ',' + n0(p[1])).join(' ');
    // the ground beside the way, its edge cut ragged (grass), lumpy (rock), round (snow) or smooth (sand)
    const bank = (sg, kind) => { const P = sg < 0 ? L : R; let d = `M${sg < 0 ? -2 : w + 2},-2`;
      for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; const m = kind === 'grass' ? 6 : kind === 'sand' ? 1 : 3;
        for (let k = 0; k < m; k++) { const t = k / m, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, s = 3 + 16 * (y / h);
          if (kind === 'grass') d += ` L${n0(x - sg * s * .2)},${n0(y)} L${n0(x + sg * s * (.6 + r() * .9))},${n0(y + s * .35)}`;
          else if (kind === 'snow') d += ` Q${n0(x - sg * s * (.8 + r() * .6))},${n0(y + s * .5)} ${n0(x + sg * s * .3)},${n0(y + s * 1.1)}`;
          else if (kind === 'rock') d += ` L${n0(x - sg * s * (.3 + r() * .8))},${n0(y + s * .3)} L${n0(x + sg * s * .2)},${n0(y + s * .9)}`;
          else d += ` L${n0(x + sg * s * .2)},${n0(y)}`; } }
      return d + ` L${n0(P[P.length - 1][0])},${h + 2} L${sg < 0 ? -2 : w + 2},${h + 2} Z`; };
    let under = '', pave = '', dark = '', banks = '', bankCls = side === 'snow' ? 'snow' : side === 'sand' ? 'sand' : 'side', wave = '';
    if (side === 'water') { under = `<rect class="water" x="0" y="0" width="${w}" height="${h}"/>`; for (let j = 1; j < 12; j++) { const y = rowY(j, 12), s = 6 + 22 * y / h; for (let x = (j % 2) * s * 2 - s * 2; x < w; x += s * 5.5) wave += `M${n0(x)},${n0(y)} q${n0(s * .7)},${n0(-s * .35)} ${n0(s * 1.4)},0 q${n0(s * .7)},${n0(s * .35)} ${n0(s * 1.4)},0 `; } }
    else if (side) banks = bank(-1, side) + bank(1, side);
    // what the way is made of
    if (way === 'dirt' || way === 'flag' || way === 'rail') under += `<polygon class="road" points="${road}"/>`;
    if (way === 'flag') for (let j = 0; j < 10; j++) { const y0 = rowY(j, 10), y1 = rowY(j + 1, 10), g = 1 + 4 * y1 / h, k = 2 + (j % 2); let u = -1; for (let i = 0; i < k; i++) { const u1 = i === k - 1 ? 1 : -1 + 2 * (i + .7 + r() * .6) / k; pave += quad(u, u1, y0, y1, g); u = u1; } }
    if (way === 'plank') { for (let j = 0; j < 18; j++) { const y0 = rowY(j, 18), y1 = rowY(j + 1, 18); pave += quad(-1, 1, y0, y1, .6 + 2.4 * y1 / h); } for (const u of [-1.04, 1.04]) dark += quad(u - .04, u + .04, 0, h, 0); }
    if (way === 'rail') { for (let j = 0; j < 16; j++) { const y0 = rowY(j, 16), y1 = rowY(j + 1, 16); pave += quad(-.8, .8, y0, y0 + (y1 - y0) * .45, 0); } for (const u of [-.46, .46]) dark += quad(u - .035, u + .035, 0, h, 0); }
    if (way === 'step') for (let j = 1; j < 8; j++) { const y = rowY(j, 7.6), s = hw(y), ux = (j % 2 ? -.18 : .18) + (r() - .5) * .12; const rx = s * (.32 + r() * .08), ry = rx * (.22 + .1 * y / h); pave += `M${n0(X(ux, y) - rx)},${n0(y)} a${n0(rx)},${n0(ry)} 0 1,0 ${n0(rx * 2)},0 a${n0(rx)},${n0(ry)} 0 1,0 ${n0(-rx * 2)},0 Z`; }
    if (way === 'board' || way === 'aisle') {   // floorboards: thin seams toward the far end, and the ends of the boards staggered
      under += `<rect class="sand" x="0" y="0" width="${w}" height="${h}"/>`;
      for (let u = -4; u <= 4; u += .5) { pave += quad(u - .012, u + .012, 0, h, 0); for (let j = 1; j < 9; j++) if ((j + Math.round(u * 2)) % 3 === 0) { const y0 = rowY(j, 9); pave += quad(u, u + .5, y0, y0 + 1 + 2 * y0 / h, 0); } }
      if (way === 'aisle') { dark += quad(-.5, .5, 0, h, 0); under += `<path class="rug" d="${quad(-.5, .5, 0, h, 0)}"/>`; pave += quad(-.43, -.4, 0, h, 0) + quad(.4, .43, 0, h, 0); dark = ''; } }
    // what stands along the way: tufts, stones, posts, crosses, lanterns, columns, barrels, crates
    const tuft = (x, y, s) => { let d = `M${n0(x - s)},${n0(y)}`; const n = 5 + Math.floor(r() * 3); for (let k = 0; k <= n; k++) { const bx = x - s + 2 * s * k / n; d += ` L${n0(bx + (r() - .5) * s * .5)},${n0(y - s * (.9 + r() * 1.3))} L${n0(bx + s / n)},${n0(y - s * .15)}`; } return d + ` L${n0(x + s)},${n0(y)} Z`; };
    const stone = (x, y, s) => `M${n0(x - s)},${n0(y)} Q${n0(x - s * .9)},${n0(y - s * .8)} ${n0(x - s * .1)},${n0(y - s * .75)} Q${n0(x + s * .9)},${n0(y - s * .6)} ${n0(x + s)},${n0(y)} Z`;
    const rect = (x, y, ww, hh) => `M${n0(x)},${n0(y)} h${n0(ww)} v${n0(hh)} h${n0(-ww)} Z`;
    const thing = (k, x, y, s) => {
      if (k === 'post') return rect(x - s * .12, y - s * 2.4, s * .24, s * 2.4) + rect(x - s * .2, y - s * 2.5, s * .4, s * .16);
      if (k === 'cross') return rect(x - s * .1, y - s * 2.2, s * .2, s * 2.2) + rect(x - s * .6, y - s * 1.7, s * 1.2, s * .2) + stone(x, y, s * .7);
      if (k === 'lantern') return rect(x - s * .5, y - s * .3, s, s * .3) + rect(x - s * .16, y - s * 1.6, s * .32, s * 1.3) + rect(x - s * .45, y - s * 2.3, s * .9, s * .7) + `M${n0(x - s * .8)},${n0(y - s * 2.3)} L${n0(x)},${n0(y - s * 2.9)} L${n0(x + s * .8)},${n0(y - s * 2.3)} Z`;
      if (k === 'col') return rect(x - s * .7, y - s * .4, s * 1.4, s * .4) + rect(x - s * .45, y - s * 4.2, s * .9, s * 3.8);
      if (k === 'barrel') return `M${n0(x - s * .7)},${n0(y)} Q${n0(x - s)},${n0(y - s * .8)} ${n0(x - s * .7)},${n0(y - s * 1.6)} H${n0(x + s * .7)} Q${n0(x + s)},${n0(y - s * .8)} ${n0(x + s * .7)},${n0(y)} Z`;
      if (k === 'crate') return rect(x - s * .8, y - s * 1.4, s * 1.6, s * 1.4);
      if (k === 'rock') return stone(x, y, s * (.6 + r() * .5));
      return tuft(x, y, s);
    };
    let near = '', far = '';
    if (prop) { const tall = ['post', 'cross', 'lantern', 'col', 'barrel', 'crate'].includes(prop), N = tall ? 7 : 16;
      for (const sg of [-1, 1]) for (let i = 0; i < N; i++) {
        const t = (i + (tall ? .5 : .2 + r() * .6)) / N, y = h * Math.pow(t, 1.25), x = X(sg * (tall ? 1.12 : 1 + r() * .03), y), s = 5 + 30 * Math.pow(y / h, 1.1);
        if (x < -s * 2 || x > w + s * 2) continue;
        let d = thing(prop, x, y, s);
        if (tall && side && side !== 'water' && r() < .6) d += thing(side === 'snow' || side === 'rock' ? 'rock' : 'tuft', X(sg * 1.3, y), y, s * .8);   // something small beside each post
        if (y < h * .4) far += d; else near += d;
      } }
    f.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="w-${way} s-${side || 'none'}" aria-hidden="true">${under}<path class="wave" d="${wave}"/><path class="pave" d="${pave}"/><path class="dark" d="${dark}"/><path class="${bankCls}" d="${banks}"/><path class="far" d="${far}"/><path class="tuft" d="${near}"/></svg>`;
  }
  function layoutDock() {
    const pc = PCQ.matches;
    const strip = $('strip');
    let h = 0;
    if (pc) {
      h = Math.max(250, strip.offsetHeight + 24, Math.round(innerHeight * .42));   // the road below the backdrop: the same height for text and choices
      // while the text runs, the dock never shrinks (and starts tall enough for most lines): the backdrop keeps its size line to line
      if (!$('tx').classList.contains('hide')) { h = Math.max(h, Math.round(innerHeight * .42), G.dockText || 0); G.dockText = h; }
      else G.dockText = 0;
    }
    document.documentElement.style.setProperty('--dockH', (pc ? h : 0) + 'px');
    // how far down the road the front row stands: fixed for the window, so nobody moves when the text strip changes
    // the backdrop rises a little on a tall screen; the back row stands on the road just below it (not up in the air)
    const dep = pc ? Math.max(0, Math.round(innerHeight * .42) - 250) : 0, raise = Math.round(dep * .45);
    document.documentElement.style.setProperty('--raise', raise + 'px');
    if (pc) document.documentElement.style.setProperty('--backB', Math.round(26 + raise - .2 * (h + 16 + raise)) + 'px');   // the back row stands on the far end of the road else document.documentElement.style.removeProperty('--backB');
    document.documentElement.style.setProperty('--fs', pc ? '1.1' : '1');
    document.documentElement.style.setProperty('--depth', (pc ? Math.max(0, Math.round(innerHeight * .42) - 250) : 0) + 'px');
    if (!pc) fitStage();
    sizeCast();
    requestAnimationFrame(drawFloor);
  }
  // a phone: the dock at the bottom is only as tall as what it holds; the stage takes all the rest
  // while lines run, the dock never shrinks (the box holds its size from line to line)
  function fitStage() {
    if (PCQ.matches) return;
    const d = $('dock');
    let h = d.classList.contains('hide') ? 0 : d.offsetHeight;
    if (h && !$('tx').classList.contains('hide')) { h = Math.max(h, G.dockTextM || 0); G.dockTextM = h; d.style.minHeight = h + 'px'; } else { G.dockTextM = 0; d.style.minHeight = ''; }   // the held height is the box's own, so no gap opens above it
    const sh = Math.max(Math.round(innerHeight * .46), innerHeight - h);
    if (G.stageHM !== sh) { G.stageHM = sh; document.documentElement.style.setProperty('--stageH', sh + 'px'); requestAnimationFrame(drawFloor); }
  }
  if (window.ResizeObserver) new ResizeObserver(() => { if (G.scr === 'play') fitStage(); }).observe($('dock'));
  function sizeCast() {
    // the puppets' size does not follow the text strip: on PC it is reckoned from a fixed strip height, so it only changes with the window
    const c = $('cast');
    const h = PCQ.matches ? Math.max(120, $('stage').clientHeight - Math.max(250, Math.round(innerHeight * .42)) - 56 - 120) : c.clientHeight;   // one size with or without the name boards above, so nobody grows or shrinks between scenes
    const pw = PCQ.matches ? Math.max(54, Math.min(150, h * .66 * 120 / 250)) : Math.max(64, Math.min(100, (innerHeight - 270 - 60) * .26, innerWidth * .26));   // a phone: as tall as the stage allows, narrow enough for a row of four or five
    c.style.setProperty('--pw', pw + 'px');
  }
  // the people on the stage: ids, and how to stand them
  function setCast(ids, o) {
    o = o || {};
    const c = $('cast');
    const have = {}; c.querySelectorAll('.pp').forEach(e => have[e.dataset.id] = e);
    const n = ids.length;
    const front = o.rows === false || n <= 3 ? n : Math.ceil(n / 2);   // about half and half: the front row has one more when the count is odd
    ids.forEach((id, i) => {
      let el = have[id];
      if (!el) {
        const cc = ch(id); if (!cc) return;
        el = document.createElement('div'); el.className = 'pp idle'; el.dataset.id = id;
        el.style.setProperty('--d', (-(i * 1.37 % 4.6)).toFixed(2) + 's');   // a negative delay: already mid-sway when it appears, no still pause then a jerk
        el.innerHTML = ART.puppet(cc.look, cc.color) + `<span class="nm">${esc(cc.name)}</span>`;
        el.style.left = (o.from === 'left' ? -10 : o.from === 'right' ? 110 : 50) + '%';
        if (!o.from) el.style.opacity = '0';
        c.appendChild(el);
        el.onclick = () => { if (G.onPup && !G.talking && $('sheet').classList.contains('hide') && $('tx').classList.contains('hide')) G.onPup(id); };
      }
      delete have[id];
      el.classList.remove('lift', 'drop', 'fallen', 'speak', 'dim', 'sel', 'turn');
      const row = i < front ? 0 : 1, k = row ? i - front : i, m = row ? n - front : front;
      const x = m === 1 ? (o.x || 50) : (o.span ? o.span[0] : 10) + ((o.span ? o.span[1] - o.span[0] : 80) * (k + (row ? .5 : 0)) / Math.max(1, m - (row ? 0 : 1)));
      el.classList.toggle('back', !!row); el.classList.toggle('front', !row); el.classList.toggle('mid', !!o.mid);   // the day's search: the people stand halfway up the road, above the menu, names showing
      requestAnimationFrame(() => { el.style.left = Math.min(94, Math.max(6, x)) + '%'; el.style.bottom = ''; el.style.opacity = ''; });
      if (o.fallen === id) el.classList.add('fallen');
    });
    for (const id in have) { const e = have[id]; e.style.opacity = '0'; setTimeout(() => e.remove(), 600); }
    if (S) renderRoster();
  }
  const pup = id => $('cast').querySelector(`.pp[data-id="${id}"]`);
  function speakPup(id) { $('cast').querySelectorAll('.pp.speak').forEach(e => e.classList.remove('speak')); const e = id && pup(id); if (e) e.classList.add('speak'); }

  /* ---------- the text strip: narration and speech, one page at a time ---------- */
  function showTx() { $('tx').classList.remove('hide'); $('menu').classList.add('hide'); layoutDock(); }
  function showMenu(html) { $('tx').classList.add('hide'); const m = $('menu'); m.innerHTML = html; m.classList.remove('hide'); layoutDock(); m.querySelector('button')?.focus({ preventScroll: true }); }
  function say(items) { return new Promise(res => { G.q = items.filter(Boolean); G.qres = res; showTx(); nextPage(); }); }
  function nextPage() {
    if (G.typing) { finishType(); return; }
    const it = G.q.shift();
    if (!it) { speakPup(null); $('tx').classList.remove('done'); const r = G.qres; G.qres = null; r && r(); return; }
    if (it.fx) it.fx();
    const tx = $('tx'), who = tx.querySelector('.who'), nmEl = tx.querySelector('.name');
    const id = it.who;
    if (id && id !== 'you') { who.classList.remove('none'); who.innerHTML = bust(id) + `<b>${esc(nm(id))}</b>`; nmEl.textContent = ''; speakPup(id); }
    else if (id === 'you') { who.classList.add('none'); nmEl.textContent = 'あなた（' + ch(S.pc).short + '）'; speakPup(null); }
    else { who.classList.add('none'); nmEl.textContent = it.title || ''; speakPup(null); }
    tx.classList.toggle('narr', !id);
    G.talkVo = voiceOf(id);
    type(it.text);
    renderRoster();
    SND.page();
  }
  // the talk sound: each voice has its own pitch and mouth; each person shifts it a little
  const VO = { elder: { f: 128, mouth: .85, len: .09, range: 1.5 }, polite: { f: 245, mouth: 1.05 }, rough: { f: 118, wave: 'square', mouth: .8, vol: .75 }, cheer: { f: 310, wave: 'square', mouth: 1.2, range: 3, glide: 1, vol: .8 },
    cool: { f: 172, range: 1 }, timid: { f: 262, wave: 'sine', mouth: 1.1, vol: .75, len: .05 }, noble: { f: 150, mouth: .95, range: 1 }, sister: { f: 225, wave: 'square', mouth: 1.1, vol: .75 },
    child: { f: 390, wave: 'square', mouth: 1.3, range: 3, glide: 2, vol: .75, len: .055 }, pious: { f: 235, wave: 'sine', range: 1 }, merchant: { f: 192, wave: 'sawtooth', vol: .6 }, blunt: { f: 108, mouth: .8, range: .5, len: .1 } };
  function voiceOf(id) {
    if (!id) return null;
    if (id === 'you') return { f: 200, mouth: 1 };
    const c = ch(id); if (!c) return null;
    const v = Object.assign({}, VO[c.voice] || { f: 200 });
    let hsh = 0; for (const x of c.id) hsh = (hsh * 31 + x.charCodeAt(0)) | 0;
    v.f *= 1 + ((Math.abs(hsh) % 9) - 4) * .025;
    return v;
  }
  function type(text) {
    const t = $('tx').querySelector('.t');
    const html = esc(text).replace(/\*\*(.+?)\*\*/g, '<span class="k">$1</span>');
    const chars = []; let inTag = false, buf = '';
    for (const c of html) { if (c === '<') inTag = true; if (inTag) { buf += c; if (c === '>') { inTag = false; chars.push(buf); buf = ''; } continue; } if (c === '&') { buf = c; continue; } if (buf) { buf += c; if (c === ';') { chars.push(buf); buf = ''; } continue; } chars.push(c); }
    const sp = [40, 24, 11, 0][pref.speed];
    $('tx').classList.remove('done');
    if (!sp) { t.innerHTML = html; $('tx').classList.add('done'); return; }
    t.innerHTML = chars.map(c => c[0] === '<' ? c : `<i>${c}</i>`).join('');
    const is = t.querySelectorAll('i'); let k = 0;
    const vo = G.talkVo, quiet = /[\s、。！？…—「」『』（）・\-]/;
    G.typing = setInterval(() => { if (G.paused) return; let say = false; for (let s = 0; s < 2 && k < is.length; s++) { const ch0 = is[k].textContent; if (!quiet.test(ch0)) say = true; is[k++].style.opacity = 1; } if (say) SND.talk(vo); if (k >= is.length) finishType(); }, sp * 2);
  }
  function finishType() { clearInterval(G.typing); G.typing = null; const t = $('tx').querySelector('.t'); t.querySelectorAll('i').forEach(i => i.style.opacity = 1); $('tx').classList.add('done'); }
  $('tx').addEventListener('click', nextPage);
  // the whole stage and the strip around the text turn the page too (a phone's thumb should not have to find the box)
  document.addEventListener('click', e => {
    if ($('tx').classList.contains('hide') || !$('sheet').classList.contains('hide') || G.scr !== 'play') return;
    const t = e.target; if (!t.closest || t.closest('#tx') || !t.closest('#stage,#dock')) return;
    if (t.closest('#roster button,#roster .ro')) return;
    e.stopPropagation(); e.preventDefault(); nextPage();
  }, true);
  // when the browser loses focus, the play stops (sound, lamp flicker, puppets, letters) until it comes back
  function setPaused(p) { G.paused = !!p; document.body.classList.toggle('paused', G.paused); SND.pause(G.paused); }
  window.addEventListener('blur', () => setPaused(true));
  window.addEventListener('focus', () => setPaused(false));
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));   // phones often give no focus event on coming back: being visible again is enough
  window.addEventListener('pageshow', () => setPaused(document.hidden));
  // any touch brings the play (and the sound) back, in case the browser kept it stopped
  document.addEventListener('pointerdown', () => { if (G.paused && !document.hidden) setPaused(false); SND.unlock(); }, true);
  document.addEventListener('keydown', e => {
    // F: full screen on / off (not while typing, not with a modifier)
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) {
      e.preventDefault();
      const d = document, el = d.documentElement;
      try { if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (err) {}
      return;
    }
    if (!$('sheet').classList.contains('hide')) { if (e.key === 'Escape') closeSheet(); return; }
    if (G.scr === 'play' && !$('tx').classList.contains('hide') && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); nextPage(); }
  });

  /* ---------- sheets ---------- */
  let sheetRes = null;
  function sheet(html, onopen) { $('sheetBox').innerHTML = html; $('sheet').classList.remove('hide'); onopen && onopen($('sheetBox')); $('sheetBox').querySelector('button')?.focus({ preventScroll: true }); $('sheetBox').scrollTop = 0; return new Promise(r => sheetRes = r); }   // always open at the top (the title)
  function closeSheet(v) { $('sheet').classList.add('hide'); const r = sheetRes; sheetRes = null; r && r(v); }
  $('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(null); });
  // choose a person from a grid
  function pickPerson(title, sub, ids, o) {
    o = o || {};
    const off = o.off || {};
    const btns = ids.map(id => off[id] ? `<button class="pb off" disabled>${bust(id)}<span>${esc(nm(id))}</span><small>${esc(off[id])}</small></button>` : `<button class="pb" data-id="${id}">${bust(id)}<span>${esc(nm(id))}</span>${o.cap && o.cap[id] ? `<small class="cap">${esc(o.cap[id])}</small>` : ''}${o.mark && S ? `<i class="mk ${S.pl.notes[id] || ''}"></i>` : ''}</button>`).join('');
    return sheet(`<button class="ib x" data-x aria-label="閉じる"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}<div class="grid-pick">${btns}</div><div class="foot"><button class="btn" data-x>もどる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(null));
      box.querySelectorAll('.pb:not(.off)').forEach(b => b.onclick = () => closeSheet(b.dataset.id));
    });
  }
  function pickOpt(title, sub, opts) {
    return sheet(`<button class="ib x" data-x aria-label="閉じる"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}<div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}" ${o.dis ? 'disabled style="opacity:.4"' : ''}>${o.ic || ''}<span>${esc(o.t)}${o.s ? `<small>${esc(o.s)}</small>` : ''}</span></button>`).join('')}</div><div class="foot"><button class="btn" data-x>もどる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(null));
      box.querySelectorAll('.opt').forEach(b => b.onclick = () => closeSheet(opts[+b.dataset.i].v));
    });
  }


  /* ---------- screens ---------- */
  function scr(name) {
    G.scr = name;
    if (name !== 'play') { $('roster')?.classList.add('hide'); document.body.classList.remove('has-roster'); }
    for (const id of ['scrTitle', 'scrSelect', 'scrSetup']) $(id).classList.toggle('hide', id !== 'scr' + name[0].toUpperCase() + name.slice(1));
    document.body.className = document.body.className.replace(/scr-\w+/, '') + ' scr-' + name;
    const play = name === 'play';
    $('dock').classList.toggle('hide', !play);
    $('btnNb').classList.toggle('hide', !play);
    $('hbWhere').textContent = '';
    $('hbAp').innerHTML = '';
    if (!play) { document.body.classList.remove('nb-open', 'night', 'crowd'); setNb(false); $('cast').innerHTML = ''; $('fx').innerHTML = ''; }
    document.body.classList.toggle('anim-off', !pref.anim);
    document.body.classList.toggle('show-names', !!pref.names);
  }
  function palette(s) {
    const r = document.documentElement.style;
    const p = s ? s.pal : { paper: '#e9e1d3', lamp: '#f3c98a', ink: '#15110f', night: '#1b2530', moon: '#aebccc', acc: '#7a2e3a' };
    for (const k in p) r.setProperty('--' + k, p[k]);
    document.querySelector('meta[name=theme-color]').content = p.ink;
  }

  /* ---------- title ---------- */
  function buildTitle() {
    st = window.SS_CASES.karasuba; palette(st); SND.music(null);
    const all = st.chars.concat([st.victim]);
    const n = 10, items = [];
    for (let i = 0; i < n; i++) { const c = all[(i * 3) % all.length]; items.push(ART.puppet(c.look, c.color, { rod: false })); }
    $('cyl').innerHTML = items.map((h, i) => `<div style="transform:rotateY(${i * 360 / n}deg) translateZ(200px)">${h}</div>`).join('');
    $('belt').innerHTML = items.concat(items).join('');
    $('tCont').classList.toggle('hide', !loadSave());
    S = null;
    scr('title');
  }

  /* ---------- select ---------- */
  function buildSelect() {
    palette(null); SND.music('story', .5);
    const R = rec();
    $('stories').innerHTML = CASES.map(id => window.SS_CASES[id]).map(c => {
      const r = R[c.id];
      return `<button class="sc" data-id="${c.id}" style="--p:${c.pal.paper};--l:${c.pal.lamp};--i:${c.pal.ink};--acc2:${c.pal.acc}">
        <div class="ph">${window.SSArt.scene('front', 3)}<span class="no">${esc(c.no)}</span></div>
        <div class="tx"><h3>${esc(c.title)}<small>${esc(c.kana)}</small></h3><div class="tg">${esc(c.house)}　大正十二年・秋</div><p>${esc(c.concept)}</p>
        <div class="mood">役 4人から選べる・謎 5種・展開 4種</div><div class="rec">${r ? `最高評価 ${r.best}・解決 ${r.win}/${r.plays}` : 'まだ遊んでいない'}</div></div></button>`;
    }).join('') + `<div class="sc soon"><div class="ph"></div><div class="tx"><h3>第二の事件<small>じゅんびちゅう</small></h3><p>次の館の扉は、まだ閉ざされている。</p></div></div>`;
    $('stories').querySelectorAll('.sc[data-id]').forEach(b => b.onclick = () => { G.caseId = b.dataset.id; SND.page(); buildSetup(); });
    scr('select');
  }

  /* ---------- setup ---------- */
  function buildSetup() {
    st = window.SS_CASES[G.caseId]; palette(st);
    $('setTitle').innerHTML = `<span style="font:400 1.3em var(--brush);letter-spacing:.06em">${esc(st.title)}</span>　<small style="font:700 15px var(--ui);color:var(--mute)">${esc(st.no)}</small>`;
    $('setConcept').textContent = st.concept;
    $('setDiff').innerHTML = E.DIFF.map((d, i) => `<button class="tile${G.diff === i ? ' on' : ''}" data-d="${i}"><b>${d.name}</b><span class="cnt">調べる${d.ap}・聞く${d.talk}</span><span>${DIFFT[i]}</span></button>`).join('');
    const roles = [['auto', 'おまかせ', '役をくじで決める']].concat(st.chars.filter(c => c.pc).map(c => [c.id, c.name, c.job]));
    $('setRole').innerHTML = roles.map(([r, n, d]) => `<button class="tile${G.role === r ? ' on' : ''}" data-r="${r}">${r === 'auto' ? ROLE_ICON.auto : `<span class="rb">${bust(r)}</span>`}<b>${esc(n)}</b><span>${esc(d)}</span></button>`).join('');
    $('setRules').innerHTML = `<b>この事件のしくみ</b>選ばなかった役の人物も、館の客として事件に居合わせる。犯人・動機・凶器・時刻、そしていくつかの謎の答えは、遊ぶたびにくじで決まる。役ごとの目的も、毎回ちがう。`;
    $('setRules').classList.remove('hide');
    const R = rec()[st.id];
    $('setFeatH').innerHTML = '記録';
    $('setFeats').innerHTML = R ? `<div class="feat got"><i>★</i><b>最高評価 ${R.best}</b><span>解決 ${R.win} / 遊んだ回数 ${R.plays}</span></div>` : '<div class="feat"><i>☆</i><b>まだ記録はない</b><span>犯人を当てると、解決に数えられる。</span></div>';
    $('setDiff').querySelectorAll('.tile').forEach(b => b.onclick = () => { G.diff = +b.dataset.d; buildSetup(); });
    $('setRole').querySelectorAll('.tile').forEach(b => b.onclick = () => { G.role = b.dataset.r; buildSetup(); });
    scr('setup');
  }

  /* ---------- the header, the roster, the notebook ---------- */
  const PH = { prologue: '序幕', morning: '朝', invest: '昼', meeting: '夕刻', night: '夜', solve: '解答', end: '真相' };
  function hud() {
    $('hbWhere').innerHTML = `${PCQ.matches ? esc(st.title) + '　' : ''}${S.phase === 'prologue' ? '' : (S.day === 3 ? '三日目' : S.day === 2 ? '二日目' : '一日目')} ${PH[S.phase] || ''}<small>${D().name}・${esc(ch(S.pc).short)}</small>`;
    if (S.phase === 'invest') $('hbAp').innerHTML = `<span>調べる</span>` + Array.from({ length: D().ap }, (_, i) => `<i class="${i < S.pl.ap ? '' : 'off'}"></i>`).join('') + `<span style="margin-left:8px">聞く</span>` + Array.from({ length: D().talk }, (_, i) => `<i class="${i < S.pl.talk ? '' : 'off'}"></i>`).join('');
    else $('hbAp').innerHTML = '';
    renderRoster();
    if (PCQ.matches && (S.phase === 'invest' || S.phase === 'meeting') && !document.body.classList.contains('nb-open') && G.nbShut !== S.day + S.phase) setNb(true);
  }
  function renderRoster() {
    const R = $('roster'); if (!R) return;
    const on = S && G.scr === 'play' && S.phase !== 'prologue';
    R.classList.toggle('hide', !on || !PCQ.matches); document.body.classList.toggle('has-roster', !!on && PCQ.matches);
    if (!on) return;
    const ids = [S.pc].concat(npcs());
    const html = ids.map(id => {
      const p = S.people[id], dead = !p.alive, mk = S.pl.notes[id] || '';
      return `<div class="ro${id === S.pc ? ' you' : ''}${dead ? ' dead' : ''}${mk ? ' mk-' + mk : ''}" data-id="${id}">${bust(id)}<b>${esc(id === S.pc ? 'あなた' : ch(id).short)}</b>${dead ? '<svg class="x" viewBox="0 0 44 44"><path d="M8 8L36 36M36 8L8 36"/></svg>' : ''}</div>`;
    }).join('');
    if (R.__html !== html) { R.innerHTML = html; R.__html = html; }
    if (PCQ.matches) { const W0 = $('stage').clientWidth - 40, n = ids.length; const w = Math.max(54, Math.min(84, Math.floor(W0 / n) - 5)); R.style.setProperty('--roW', w + 'px'); }
    R.querySelectorAll('.ro').forEach(e => e.onclick = () => { const id = e.dataset.id; if (id === S.pc || !S.people[id].alive) return; if (G.onPup && !G.talking && $('sheet').classList.contains('hide') && $('tx').classList.contains('hide')) G.onPup(id); });
  }
  function setNb(open) { document.body.classList.toggle('nb-open', open); document.documentElement.style.setProperty('--nbW', open && PCQ.matches ? '420px' : '0px'); $('btnNb').classList.toggle('on', open); setTimeout(() => { layoutDock(); if (S) renderRoster(); }, 380); if (open) renderNb(); }
  $('btnNb').onclick = () => { const o = !document.body.classList.contains('nb-open'); setNb(o); G.nbShut = !o ? S && S.day + S.phase : null; };
  $('nbClose').onclick = () => { setNb(false); G.nbShut = S && S.day + S.phase; };
  $('nbTabs').querySelectorAll('button').forEach(b => b.onclick = () => { G.nbTab = b.dataset.t; $('nbTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderNb(); });
  function renderNb() {
    if (!S || !document.body.classList.contains('nb-open')) return;
    const B = $('nbBody'), t = G.nbTab;
    B.innerHTML = t === 'ppl' ? nbPeople() : t === 'time' ? nbTime() : t === 'ev' ? nbClues() : nbQ();
    B.querySelectorAll('.marks button').forEach(b => b.onclick = () => { const id = b.dataset.id, m = b.dataset.m; S.pl.notes[id] = S.pl.notes[id] === m ? '' : m; save(); renderNb(); renderRoster(); });
  }
  const found = kind => S.clues.filter(k => S.pl.found.includes(k.id) && (!kind || k.kind === kind));
  const murderTraces = () => found('trace').filter(k => k.for === 'murder');
  function nbPeople() {
    const tr = murderTraces();
    return npcs().map(id => {
      const c = ch(id), p = S.people[id];
      const chips = E.CATS.map(cat => { const v = c.traits[cat]; const hit = D().assist && tr.some(t => t.cat === cat && (t.neg ? t.val !== v : t.val === v)); const miss = D().assist && tr.some(t => t.cat === cat && (t.neg ? t.val === v : t.val !== v)); return `<span class="chip${hit ? ' hit' : ''}${miss ? ' miss' : ''}">${esc(st.traits[cat].v[v])}</span>`; }).join('');
      const sec = p.secret && p.secret.open ? `<div class="sec">秘密：${esc(c.secrets.find(x => x.id === p.secret.id).confess.slice(0, 46))}…</div>` : '';
      const mk = S.pl.notes[id] || '';
      return `<div class="card"><div class="who-row${p.alive ? '' : ' gone'}">${bust(id)}<div style="flex:1;min-width:0"><div class="nm">${esc(c.name)}<small>${esc(c.job)}・${esc(c.from)}の出${p.alive ? '' : '・死亡'}</small></div><div class="chips">${chips}</div><div class="bel">持ち物：${esc(c.belong)}</div>${sec}</div>
        <div class="marks"><button data-id="${id}" data-m="h" class="h${mk === 'h' ? ' on' : ''}">白</button><button data-id="${id}" data-m="g" class="g${mk === 'g' ? ' on' : ''}">灰</button><button data-id="${id}" data-m="w" class="w${mk === 'w' ? ' on' : ''}">黒</button></div></div></div>`;
    }).join('') + (D().assist ? '<div class="memo-note">入門：見つけた現場の痕跡に合う特徴は色がつき、合わない特徴は線で消える。</div>' : '');
  }
  // the timeline: who says they were where, and who saw whom
  function heardSights() { const out = []; for (const by in S.said) for (const x of S.said[by].sights) out.push(Object.assign({ by }, x)); return out; }
  function claimKnown(id) { return S.said[id] && (S.pl.heardClaims || S.pl.talked[id]); }
  function nbTime() {
    const sg = heardSights();
    const head = `<tr><th></th>${st.slotShort.map(s => `<th>${s}</th>`).join('')}</tr>`;
    const rows = npcs().map(id => {
      const cells = st.slots.map((_, s) => {
        const cl = claimKnown(id) ? S.claims[id][s] : null;
        const seen = sg.filter(x => x.who === id && x.s === s && !x.fig);
        const bad = cl != null && seen.some(x => x.loc !== cl);
        return `<td class="${bad ? 'bad' : ''}">${cl != null ? `<b>${esc(locName(cl))}</b>` : '<span class="src">？</span>'}${seen.map(x => `<i>${esc(sn(x.by))}が${esc(locName(x.loc))}で</i>`).join('')}</td>`;
      }).join('');
      return `<tr class="${S.people[id].alive ? '' : 'gone'}"><th>${esc(ch(id).short)}</th>${cells}</tr>`;
    }).join('');
    const figs = sg.filter(x => x.fig).map(x => `<div class="li">${esc(slotName(x.s))}、${esc(locName(x.loc))}で${esc(figText(x))}を見た　<span class="src">${esc(sn(x.by))}の話</span></div>`).join('');
    return `<table class="tl">${head}${rows}</table><div class="memo-note">太字は本人の言い分。その下は、ほかの人が見た姿。食い違うところは赤くなる。人は他人のことでは嘘をつかない――犯人をのぞいて。</div>${figs ? '<div class="nh">暗がりの人影</div>' + figs : ''}`;
  }
  function figText(x) { const c = ch(x.who); const cats = ['height', 'foot', 'hand'].filter(k => st.traits[k].fig[c.traits[k]]); const cat = cats[(x.s + x.loc.length) % cats.length]; return st.traits[cat].fig[c.traits[cat]]; }
  function clueText(k) {
    const W = st.weapons.find(w => w.id === S.truth.weapon), L = locName(k.at);
    const belongOf = id => `${ch(id).name}の${ch(id).belong}`;
    switch (k.kind) {
      case 'trace': return k.neg ? `${L}：${st.traits[k.cat].name}は「${st.traits[k.cat].v[k.val]}」ではない。そう読める跡が残っている。` : `${L}：${st.traits[k.cat].tr[k.val]}${k.second ? '（第二の事件の現場）' : ''}`;
      case 'weapon': return `${L}で見つかった：${W.item}`;
      case 'missing': return `${L}：${W.missing}`;
      case 'watch': return `${L}：${fill(st.time.watch, { slot: slotName(k.slot) })}（物は嘘をつくことがある）`;
      case 'sound': return `${sn(k.by)}の話：${fill(st.time.sound, { slot: slotName(k.slot), loc: locName(k.loc) })}`;
      case 'lastSeen': return `${sn(k.by)}の話：${fill(st.time.lastSeen, { slot: slotName(k.slot), loc: locName(k.loc) })}`;
      case 'belong': return `${L}に、${belongOf(k.who)}が落ちていた。（物は嘘をつくことがある）`;
      case 'moved': return `${L}：${k.part === 'hint' ? st.twists.moved.hint : st.twists.moved.true}`;
      case 'motive': return `${L}で見つけた書きつけ：${st.motiveDocs[k.who][k.motive]}`;
      case 'poison': return `${L}で見つかった：${fill(st.twists.poison.item, { belong: belongOf(k.who) })}`;
      case 'figWit': { const c = ch(S.truth.c); return `${sn(k.by)}の話：ゆうべ、襲ってきたのは${st.traits[k.cat].fig[c.traits[k.cat]] || '人影'}だった。`; }
      case 'role': { const it = st.roles[S.pc].items[k.item]; return `${L}で見つけた「${it.name}」：${it.text}`; }
      case 'm': {
        const M = st.mysteries.find(m => m.id === k.m);
        if (k.part === 'trace') return `${L}（${M.q.replace(/は誰か$/, '')}の跡）：${st.traits[k.cat].tr[k.val]}`;
        if (k.part === 'item') return `${L}で見つかった：${fill(M.item, { belong: belongOf(k.who) })}`;
        if (k.part === 'diary') return `${L}で見つかった：${fill(M.item, { trait: st.traits[k.cat].v[k.val] })}`;
        if (k.part === 'receipt') return `${L}で見つかった：${fill(st.childReceipt, { from: k.from })}`;
        if (k.part === 'glove') return `${L}で見つかった：${fill(M.item, { hand: k.val === 'L' ? '左手' : '右手' })}`;
      }
    }
    return '';
  }
  function nbClues() {
    const ks = found();
    if (!ks.length) return '<div class="li"><span class="src">まだ手がかりはない</span></div>';
    const group = [['現場の痕跡', k => k.kind === 'trace' || k.kind === 'moved'], ['凶器', k => k.kind === 'weapon' || k.kind === 'missing'], ['時刻', k => k.kind === 'watch' || k.kind === 'sound' || k.kind === 'lastSeen'], ['落ちていた物', k => k.kind === 'belong'], ['動機の書きつけ', k => k.kind === 'motive'], ['謎の手がかり', k => k.kind === 'm' || k.kind === 'poison'], ['証言', k => k.kind === 'figWit'], ['あなたの探し物', k => k.kind === 'role']];
    let h = `<div class="li"><b>検分</b>：${esc(st.weapons.find(w => w.id === S.truth.weapon).wound)}<br>${esc(doctorLine())}</div>`;
    for (const [name, f] of group) { const g = ks.filter(f); if (g.length) h += `<div class="nh">${name}</div>` + g.map(k => `<div class="li">${esc(clueText(k))}</div>`).join(''); }
    return h;
  }
  function doctorLine() { const r = S.truth.range; return fill(st.time.doctor, { from: slotName(r[0]), to: slotName(r[1]) }); }
  function nbQ() {
    const qs = [['犯人は誰か', '話し合いのあと、三日目の朝に答える'], ['動機・凶器・時刻', '']].concat(S.twists.includes('moved') ? [[st.twists.moved.q, '']] : []).concat(S.mysteries.map(m => [st.mysteries.find(x => x.id === m.id).q, m.confessed ? `${sn(m.x)}が打ち明けた` : ''])).concat(S.truth.p2 ? [[st.twists.poison.q, '']] : []).concat(S.truth.acc ? [[st.twists.accomplice.q, '']] : []);
    let h = '<div class="nh">解き明かすこと</div>' + qs.map(([q, s]) => `<div class="li">${esc(q)}${s ? `　<span class="src">${esc(s)}</span>` : ''}</div>`).join('');
    h += '<div class="nh">あなたの目的</div>' + S.goals.map(g => `<div class="li">${esc(g.name)}${g.lost ? '　<span class="src" style="color:var(--wolf)">しくじった</span>' : goalSeen(g) ? '　<span class="src">済</span>' : ''}</div>`).join('');
    h += `<div class="nh">あなたの指令</div><div class="li" style="white-space:pre-line">${esc(st.roles[S.pc].ho)}</div>`;
    return h;
  }
  function goalSeen(g) { if (g.t === 'find' || g.t === 'hide') { const k = S.clues.find(x => x.kind === 'role' && x.item === g.item); return k && S.pl.items.includes(k.id); } return false; }

  /* ---------- the game ---------- */
  async function start() {
    st = window.SS_CASES[G.caseId];
    const pcs = st.chars.filter(c => c.pc).map(c => c.id);
    const pc = G.role === 'auto' ? pcs[Math.floor(Math.random() * pcs.length)] : G.role;
    S = E.newCase(st, { pc, diff: G.diff });
    S.pl.ap = 0; S.pl.talk = 0;
    scr('play'); palette(st); SND.music('story', 1);
    G.nbTab = 'ppl';
    return prologue();
  }
  async function prologue() {
    S.phase = 'prologue'; hud(); setCast([]);
    for (const p of st.prologue) {
      if (p.intros) {
        setScene('dining', false, true);
        const ids = st.chars.map(c => c.id).concat([]);
        const shown = [];
        for (const id of ids) {
          if (id === S.pc) { await say([{ text: `あなたの番だった。グラスを置き、皆の顔を見回す。\nあなたは、**${ch(id).name}**。${ch(id).job}としてこの館に来た。` }]); continue; }
          shown.push(id); setCast(shown.slice(-4), { from: shown.length % 2 ? 'left' : 'right' });
          await say([{ who: id, text: ch(id).intro }]);
        }
        continue;
      }
      if (p.handout) { await handout(); continue; }
      setScene(p.bg, !!p.night, !!p.cast);
      if (p.victim) setCast([st.victim.id], { x: 50 }); else if (!p.cast) setCast([]);
      await say([{ text: p.t, who: null }]);
      if (p.night) { SND.windOn(.08); SND.bell(.4, 1.2); }
    }
    return morning();
  }
  async function handout() {
    const R = st.roles[S.pc], c = ch(S.pc);
    await sheet(`<div class="rolecard"><p style="font:700 15px var(--ui);letter-spacing:.2em;color:var(--mute);margin:0">ハンドアウト　あなたの役</p><h3>${esc(c.name)}</h3><p style="font-size:15px;color:var(--mute);margin-top:-4px">${esc(c.job)}</p>
      <p style="white-space:pre-line;text-align:left">${esc(R.ho)}</p>
      <div class="goals"><b>あなたの目的</b><div>一、真相を明かす（犯人・動機・凶器・時刻）</div>${S.goals.map((g, i) => `<div>${['二', '三', '四'][i]}、${esc(g.name)}</div>`).join('')}</div>
      <p style="font-size:14.5px;color:var(--mute);text-align:left">ほかの人物にも、それぞれの秘密と目的がある。人は他人のことでは嘘をつかないが、自分の居場所は偽ることがある。犯人だけは何でも偽る。</p></div>
      <div class="foot" style="justify-content:center"><button class="btn pri" data-ok>胸にしまう</button></div>`, box => box.querySelector('[data-ok]').onclick = () => closeSheet(true));
  }
  async function morning() {
    S.phase = 'morning'; S.day = 1; hud(); SND.windOff();
    const T = S.truth, F = T.F;
    setScene('rooms', false); setCast([]);
    await say([{ text: st.morning }]);
    setScene(F, false); SND.thud && SND.thud();
    setCast([st.victim.id, 'tobari'].filter(id => id !== S.pc), { fallen: st.victim.id, span: [40, 64] });
    const W = st.weapons.find(w => w.id === T.weapon);
    const exam = S.pc === 'ayano' ? [{ text: `あなたは膝をつき、主治医として遺体を検分した。\n${W.wound}` }, { who: 'you', text: doctorLine() }] : [{ who: 'ayano', text: `……失礼します。${W.wound.replace(/。$/, '')}。` }, { who: 'ayano', text: doctorLine() }];
    await say([{ text: st.found[F] }].concat(exam));
    if (T.p2) await say([{ text: st.twists.poison.hint }]);
    // the found place's own marks (a moved body) are seen at once
    for (const k of S.clues) if (k.kind === 'moved' && k.part === 'hint') S.pl.found.push(k.id);
    if (F !== T.L) await say([{ text: st.twists.moved.hint }, { text: '**ここで殺されたのではないのかもしれない。**' }]);
    // the mysteries come to light
    for (const m of S.mysteries) {
      const M = st.mysteries.find(x => x.id === m.id);
      const t = fill(M.open, { slot: slotName(m.s) });
      if (m.id === 'will') { setScene('study'); setCast(['maki', 'tobari'].filter(id => id !== S.pc)); }
      else if (m.id === 'pearl') { setScene('rooms'); setCast(['saeko']); }
      else if (m.id === 'bell') { setScene('tower'); setCast([]); }
      else setScene('study');
      await say([{ text: t }, { text: `**謎：${M.q}**` }]);
    }
    setScene('hall', false, true); setCast(alive());
    await say([{ text: st.dayIntro[0] }]);
    return day(1);
  }
  async function day(n) {
    S.day = n; S.phase = 'invest'; S.pl.ap = D().ap; S.pl.talk = D().talk; S.pl.missDay = 0;
    save(); hud();
    if (n === 2) await say([{ text: st.dayIntro[1] }]);
    return hub();
  }

  /* the day: search a place, or talk to someone */
  function hub(msg) {
    S.phase = 'invest'; hud(); save();
    setScene(G.loc); setCast([], {});
    G.onPup = id => talk(id);
    const locs = st.locs.map(l => `<button class="loc${l.id === G.loc ? ' cur' : ''}" data-l="${l.id}">${window.SSArt.scene(l.id, 1)}<b>${esc(l.name)}</b>${l.id === S.truth.F ? '<em>遺体</em>' : S.truth.second && l.id === S.truth.second.loc && S.day >= 2 ? '<em>第二</em>' : ''}</button>`).join('');
    const ppl = alive().map(id => `<button class="pb${S.pl.talked[id] === S.day ? ' talked' : ''}" data-p="${id}">${bust(id)}<span>${esc(ch(id).short)}</span><i class="mk ${S.pl.notes[id] || ''}"></i></button>`).join('');
    const hint = msg || (S.pl.ap + S.pl.talk > 0 ? `場所を調べる（残り${S.pl.ap}）か、話を聞く（残り${S.pl.talk}）。話を聞くと、その人の夜の足取りと、見たものがわかる。` : '今日はもう動けない。話し合いへ向かおう。');
    showMenu(`<div class="hub"><div><h4>調べる場所</h4><div class="locs">${locs}</div></div><div><h4>話を聞く</h4><div class="ppl">${ppl}</div></div><div class="hubfoot"><div class="hint">${esc(hint)}</div>${S.pl.items.length ? `<button class="btn" id="hItems">${IC.bag}持ち物 <small>${S.pl.items.length}</small></button>` : ''}<button class="btn pri" id="hMeet">${IC.go}話し合いへ</button></div></div>`);
    $('menu').querySelectorAll('.loc').forEach(b => b.onclick = () => search(b.dataset.l));
    $('menu').querySelectorAll('.pb').forEach(b => b.onclick = () => talk(b.dataset.p));
    if ($('hItems')) $('hItems').onclick = showItems;
    $('hMeet').onclick = async () => { if (S.pl.ap + S.pl.talk > 0) { const ok = await pickOpt('話し合いへ向かう？', `まだ調べる${S.pl.ap}回・聞く${S.pl.talk}回が残っている。`, [{ t: '話し合いへ向かう', v: 1, ic: IC.go }]); if (!ok) return; } meeting(); };
    renderNb();
  }
  async function search(loc) {
    if (S.pl.ap <= 0) return hub('今日はもう、調べる時間がない。話を聞くか、話し合いへ。');
    G.loc = loc; setScene(loc); setCast([]);
    const r = E.search(st, S, loc);
    const L = st.locs.find(l => l.id === loc);
    const items = [{ text: `${L.name}を調べる。\n${L.desc}` }];
    if (r.k === 'none') items.push({ text: L.empty });
    for (const k of r.got || []) {
      items.push({ text: clueText(k).replace(/^[^：]+：/, '') + '\n**（手帳に書きとめた）**' });
      if (k.kind === 'role') { const it = st.roles[S.pc].items[k.item]; const g = S.goals.find(x => x.item === k.item); items.push({ text: g && g.t === 'hide' ? `**「${it.name}」を、誰にも見られずに懐へしまった。**` : `**「${it.name}」を見つけた。**` }); }
    }
    SND.page();
    await say(items);
    save(); hub();
  }
  // what someone says about the night: where they were, and whom they saw
  function nightSpeech(id) {
    const T = tone(id), cl = S.claims[id];
    const parts = []; let i = 0;
    while (i < cl.length) { let j = i; while (j + 1 < cl.length && cl[j + 1] === cl[i]) j++; parts.push({ from: i, to: j, loc: cl[i] }); i = j + 1; }
    const where = parts.map(p => (p.from === p.to ? slotName(p.from) + 'ごろは' : `${slotName(p.from)}から${slotName(p.to)}までは`) + (p.loc === E.HOME ? '客室に' : locName(p.loc) + 'に')).join('、');
    const lines = [{ who: id, text: `ゆうべですか。${where}${T.was}。` }];
    const sg = (S.sights[id] || []).filter(x => x.loc !== E.HOME || x.s === S.truth.T);
    if (sg.length) lines.push({ who: id, text: sg.map(x => `${slotName(x.s)}ごろ、${locName(x.loc)}で${x.fig ? figText(x) : sn(x.who) === 'あなた' ? 'あなた' : ch(x.who).short + 'さん'}を${T.saw}`).join('。') + (sg.some(x => x.fig) ? '。暗くて、顔は見えなかった。' : '。') });
    else lines.push({ who: id, text: `${T.none}。` });
    for (const k of S.clues) if (k.by === id && (k.kind === 'sound' || k.kind === 'lastSeen' || (k.kind === 'figWit' && S.day >= 2))) { lines.push({ who: id, text: clueText(k).replace(/^[^：]+：/, '') }); if (!S.pl.found.includes(k.id)) S.pl.found.push(k.id); }
    return lines;
  }
  async function talk(id) {
    if (!S.people[id].alive) return;
    if (S.pl.talk <= 0 && S.pl.talked[id] !== S.day) return hub('今日はもう、話を聞く時間がない。');
    G.talking = true;
    try {
      setScene(G.loc); setCast([id], { x: 56 });
      if (S.pl.talked[id] !== S.day) E.talk(st, S, id); else E.learn(S, id);
      hud();
      await say([{ who: id, text: ch(id).greet }].concat(nightSpeech(id)));
      for (;;) {
        const mine = S.claims[id].map((loc, s) => ({ s, loc }));
        const opts = [{ t: '矛盾を突く', s: 'この人の言い分と、ほかの人が見た姿の食い違いを、ふたりきりで問いただす（ほかの者には聞こえない）', v: 'clash', ic: IC.clash },
          { t: '物を見せる', s: '持ち物の中から、ひとつ見せて反応をうかがう', v: 'show', ic: IC.show, dis: !S.pl.items.length },
          { t: '話を終える', v: 'end', ic: IC.go }];
        const v = await pickOpt(`${ch(id).name}と話す`, '', opts);
        if (!v || v === 'end') break;
        if (v === 'clash') await clash(id, false);
        if (v === 'show') await showTo(id);
      }
    } finally { G.talking = false; }
    save(); hub();
  }
  // confront: pick one claim, then the sighting that contradicts it
  async function clash(only, pub) {
    const sg = heardSights().filter(x => !x.fig);
    const who = only ? [only] : alive().filter(id => claimKnown(id));
    const claims = who.flatMap(id => S.claims[id].map((loc, s) => ({ id, s, loc })));
    if (!claims.length) { await say([{ text: 'まだ、誰の言い分も聞いていない。' }]); return; }
    const pickC = await pickOpt('どの言い分を問いただす？', only ? '' : '皆の前で問いただす。外れると、あなたの言葉が軽くなる。', claims.map((c, i) => ({ t: `${ch(c.id).short}「${slotName(c.s)}は${locName(c.loc)}にいた」`, v: String(i) })));
    if (pickC == null) return;
    const c = claims[+pickC];
    if (!sg.length) { await say([{ text: '突きつけられる証言が、まだない。' }]); return; }
    const pickS = await pickOpt('何を突きつける？', `${ch(c.id).short}は「${slotName(c.s)}は${locName(c.loc)}にいた」と言う。`, sg.map((x, i) => ({ t: `${sn(x.by)}の話：${slotName(x.s)}、${locName(x.loc)}で${sn(x.who)}を見た`, v: String(i) })));
    if (pickS == null) return;
    const x = sg[+pickS];
    const cid = x.who + '@' + x.s + '<' + x.by;
    const ok = x.who === c.id && x.s === c.s && x.loc !== c.loc;
    if (!ok) {
      S.pl.misses++; S.pl.missDay = (S.pl.missDay || 0) + 1;
      await say([{ who: c.id, text: x.who !== c.id ? 'それは、わたしの話ではありませんよね。' : x.s !== c.s ? '時刻が違うでしょう。' : 'それなら、言っていることと同じだ。' }, { text: `**的外れだった。**${pub ? '皆の視線が、あなたから少し離れた。' : ''}` }]);
      return;
    }
    const r = E.confront(st, S, cid, pub);
    if (r.k === 'deny') { await say([{ who: c.id, text: tone(c.id).deny }, { text: r.again ? '言い張った。けれど、声がわずかに揺れていた。もう一度突きつければ、崩れるかもしれない。' : 'きっぱりと否んだ。見間違えたのは、どちらだろう。' }]); return; }
    if (r.k === 'crack') {
      const lines = [{ text: `${ch(c.id).short}は、しばらく黙っていた。` }];
      const why = r.why;
      if (why === 'secret') lines.push({ who: c.id, text: ch(c.id).secrets.find(s => s.id === S.people[c.id].secret.id).confess });
      else if (why.startsWith('m:')) { const m = S.mysteries.find(mm => 'm:' + mm.id === why); lines.push({ who: c.id, text: `……${slotName(r.s)}は、${locName(r.loc)}に${tone(c.id).was}。` }, { text: st.mysteries.find(x => x.id === m.id).reveal[c.id] }); }
      else if (why === 'acc') lines.push({ who: c.id, text: fill(st.twists.accomplice.crack, { c: ch(S.truth.c).short }) });
      else if (why === 'poison') lines.push({ who: c.id, text: `……${slotName(r.s)}は、食堂の奥の配膳室に${tone(c.id).was}。旦那さまの寝酒の、支度のそばに。それ以上は、言えない。` });
      else if (why === 'crime') lines.push({ who: c.id, text: tone(c.id).crime });
      else lines.push({ who: c.id, text: `……${locName(r.loc)}に${tone(c.id).was}。` });
      lines.push({ text: `**${ch(c.id).short}は、${slotName(r.s)}に${locName(r.loc)}にいた。**（手帳の足取りを書き直した）` });
      if (pub && (S.goals.find(g => g.t === 'spare' && g.who === c.id))) lines.push({ text: '……人前で、暴いてしまった。' });
      await say(lines);
    }
  }
  async function showTo(id) {
    const ks = S.pl.items.map(i => S.clues.find(k => k.id === i)).filter(Boolean);
    const v = await pickOpt(`${ch(id).short}に、何を見せる？`, '', ks.map(k => ({ t: clueText(k).replace(/^[^：]+：/, '').slice(0, 40) + '…', v: k.id })));
    if (!v) return;
    const k = ks.find(x => x.id === v);
    const own = k.who === id;
    let t;
    if (k.kind === 'belong' || (k.kind === 'm' && k.part === 'item') || k.kind === 'poison') t = own ? `……それは、わたしの${ch(id).belong}です。どこで、それを。` : `${ch(k.who).short}さんの${ch(k.who).belong}でしょう。わたしのではありません。`;
    else if (k.kind === 'motive') t = own ? '……それを、どこで。返してください。わたしの、昔のことです。' : `わたしには、関わりのない紙です。……${ch(k.who).short}さんに聞いてみては。`;
    else if (k.kind === 'weapon') t = id === S.truth.c && D().id < 3 ? '……知らない。そんな物は、見たこともない。' : '……それが、旦那さまを。';
    else t = 'さあ……わたしには、何とも。';
    if (id === S.truth.c && own && k.kind === 'belong' && !k.planted) t = '……落としたのかもしれない。だが、それがどうした。あそこを通っただけだ。';
    await say([{ who: id, text: t.replace(/わたし/g, id === 'kyosuke' || id === 'toru' ? '俺' : id === 'maki' ? '僕' : id === 'chihaya' || id === 'suzu' ? 'あたし' : id === 'saeko' ? 'わたくし' : id === 'tobari' ? '手前' : '私') }]);
  }
  async function showItems() {
    const ks = S.pl.items.map(i => S.clues.find(k => k.id === i)).filter(Boolean);
    await sheet(`<h3>持ち物</h3>${ks.map(k => `<div class="promise">${esc(clueText(k))}</div>`).join('')}<div class="foot"><button class="btn pri" data-x>閉じる</button></div>`, box => box.querySelector('[data-x]').onclick = () => closeSheet());
    hub();
  }

  /* the evening talk: everyone says where they were; some share what they found */
  async function meeting() {
    S.phase = 'meeting'; hud(); save();
    G.onPup = null;
    setScene('hall', false, true); setCast(alive());
    SND.music('meeting', 1);
    await say([{ text: st.meetIntro[S.day - 1] }]);
    const ev = E.meeting(st, S, Math.random);
    const lines = [];
    // a few of the claims aloud (all of them go into the notebook)
    for (const id of alive().slice(0, 3)) lines.push(nightSpeech(id)[0]);
    lines.push({ text: '**皆の言い分を、手帳の「足取り」に書きとめた。**' });
    for (const e of ev) {
      if (e.t === 'sight') lines.push({ who: e.by, text: `そういえば、${slotName(e.x.s)}ごろ、${locName(e.x.loc)}で${e.x.fig ? figText(e.x) : sn(e.x.who) + (e.x.who === S.pc ? '' : 'さん')}を${tone(e.by).saw}。` });
      if (e.t === 'share' && e.by) lines.push({ who: e.by, text: `わたしも調べてみたのです。${clueText(e.k).replace(/^[^：]+：/, '')}`.replace(/わたし/g, e.by === 'kyosuke' || e.by === 'toru' ? '俺' : e.by === 'maki' ? '僕' : e.by === 'chihaya' || e.by === 'suzu' ? 'あたし' : e.by === 'saeko' ? 'わたくし' : e.by === 'tobari' ? '手前' : '私') });
      if (e.t === 'exposed' && e.by) { const it = st.roles[S.pc].items[e.k.item]; lines.push({ who: e.by, text: `これを見つけました。「${it.name}」です。……${ch(S.pc).short}さん、あなたのものですね。` }, { text: '**皆の目が、あなたに集まった。隠しておきたかった物が、明るみに出てしまった。**' }); }
    }
    if (D().cunning && Math.random() < .5 && S.truth.cframe) lines.push({ who: S.truth.c, text: `${slotName(S.truth.T)}ごろ、${locName(S.truth.L)}のそばで、${ch(S.truth.cframe).short}さんを${tone(S.truth.c).saw}。……言いにくいことですけれど。` });
    await say(lines);
    return debate();
  }
  async function debate() {
    S.phase = 'meeting'; hud(); save();
    for (;;) {
      const left = D().misses - (S.pl.missDay || 0);
      const v = await pickOpt(S.day === 1 ? '一日目の話し合い' : '最後の話し合い', `皆の前で矛盾を突ける（的外れは今日あと${left > 50 ? '何' : left}回まで）。話し合いを終えると、${S.day === 1 ? '二日目の夜になる' : '三日目の朝、答えを出す'}。`, [
        { t: '矛盾を突く', s: '言い分と、ほかの人の目撃が食い違うところを、皆の前で問いただす', v: 'clash', ic: IC.clash, dis: left <= 0 },
        { t: '手帳を開く', s: '足取りの表で、食い違いを探す', v: 'nb', ic: IC.pen },
        { t: '話し合いを終える', v: 'end', ic: IC.go }]);
      if (v === 'clash') await clash(null, true);
      else if (v === 'nb') { G.nbTab = 'time'; $('nbTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.t === 'time')); setNb(true); }
      else if (v === 'end') break;
    }
    if (S.day === 1) return night2();
    return solve();
  }
  async function night2() {
    S.phase = 'night'; hud(); save();
    setScene('rooms', true); setCast([]); SND.music('story', .4); SND.windOn(.05);
    await say([{ text: st.night2 }]);
    const sec = E.secondNight(st, S, E.rng(S.seed + 7));
    SND.windOff();
    S.day = 2; S.phase = 'morning'; hud();
    if (sec) {
      setScene(sec.loc); setCast([sec.w], { fallen: sec.w, x: 50 });
      await say([{ text: fill(st.twists.second.open, { w: ch(sec.w).name, loc: locName(sec.loc) }) }, { text: fill(sec.dead ? st.twists.second.dead : st.twists.second.alive, { w: ch(sec.w).short }) }, { text: '**第二の事件。新しい痕跡が残っているはずだ。**' }]);
    }
    setScene('hall', false, true); setCast(alive());
    return day(2);
  }

  /* the third morning: the answers */
  async function solve() {
    S.phase = 'solve'; S.day = 3; hud(); save();
    setScene('hall', false, true); setCast(alive()); SND.music('meeting', .8);
    await say([{ text: st.solveIntro }]);
    const ans = await answerSheet();
    S.ans = ans;
    return reveal();
  }
  function answerSheet() {
    const sel = (key, label, opts) => `<label class="aq"><span>${esc(label)}</span><select data-k="${key}"><option value="">―</option>${opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></label>`;
    const ppl = npcs().map(id => [id, ch(id).name]);
    let h = '<h3>解答</h3><p>大広間の皆の前で、あなたの推理を述べる。</p><div class="answers">';
    h += sel('c', '犯人は誰か', ppl);
    h += `<label class="aq"><span>動機</span><select data-k="motive"><option value="">犯人を先に選ぶ</option></select></label>`;
    h += sel('weapon', '凶器', st.weapons.map(w => [w.id, w.name]));
    h += sel('T', '時刻', st.slots.map((s, i) => [String(i), s + 'ごろ']));
    if (S.twists.includes('moved')) h += sel('L', st.twists.moved.q, st.locs.filter(l => l.id !== E.HOME).map(l => [l.id, l.name]));
    for (const m of S.mysteries) { const M = st.mysteries.find(x => x.id === m.id); h += sel('m:' + m.id, M.q, (M.who || npcs()).filter(id => id !== S.pc).map(id => [id, ch(id).name])); }
    if (S.truth.p2) h += sel('poison', st.twists.poison.q, ppl);
    if (S.truth.acc) h += sel('acc', st.twists.accomplice.q, ppl);
    h += '</div><div class="foot"><button class="btn pri" data-go>この推理で答える</button></div>';
    return sheet(h, box => {
      const cSel = box.querySelector('[data-k="c"]'), mSel = box.querySelector('[data-k="motive"]');
      cSel.onchange = () => { const c = ch(cSel.value); mSel.innerHTML = c ? c.motives.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('') : '<option value="">犯人を先に選ぶ</option>'; };
      box.querySelector('[data-go]').onclick = () => {
        const a = { m: {} };
        box.querySelectorAll('select').forEach(s => { const k = s.dataset.k, v = s.value; if (k.startsWith('m:')) a.m[k.slice(2)] = v; else a[k] = k === 'T' ? (v === '' ? null : +v) : v; });
        if (!a.c) { cSel.focus(); return; }
        closeSheet(a);
      };
    });
  }
  async function reveal() {
    S.phase = 'end'; hud(); save();
    const T = S.truth, a = S.ans, c = T.c, W = st.weapons.find(w => w.id === T.weapon);
    const hit = a.c === c;
    setCast(alive());
    await say([{ who: 'you', text: `${ch(a.c).name}――${hit ? 'あなたが、旦那さまを殺した。' : 'あなたが、旦那さまを殺した。そうでしょう。'}` }]);
    if (!hit) {
      setCast([a.c], { x: 50 });
      await say([{ who: a.c, text: tone(a.c).crime.replace(/^……/, '……違う。') }, { text: '大広間が、静まりかえった。誰も、あなたの推理にうなずかなかった。' }]);
    }
    // the truth
    SND.music(hit ? 'clear' : 'gameover', .85);
    setScene(T.L, false); setCast([c], { x: 50 });
    const mo = ch(c).motives.find(m => m.id === T.motive);
    await say([{ text: hit ? `${ch(c).short}は、長いあいだ黙っていた。やがて、百の時計の音の中で、口を開いた。` : `真相は、別のところにあった。` },
      { who: c, text: mo.text },
      { text: st.why[T.L] + '\n' + fill(W.how, { c: ch(c).name, slot: slotName(T.T), loc: locName(T.L) }) },
      T.F !== T.L ? { text: fill(st.twists.moved.reveal, { c: ch(c).short, loc: locName(T.L), found: locName(T.F) }) } : null,
      T.acc ? { text: fill(st.twists.accomplice.reveal, { a: ch(T.acc.a).short, c: ch(c).short }) } : null,
      T.second ? { text: fill(st.twists.second.reveal, { c: ch(c).short, w: ch(T.second.w).short }) } : null,
      T.framed ? { text: `${locName(T.L)}に落ちていた${ch(T.framed).name}の${ch(T.framed).belong}は、${ch(c).short}が置いたものだった。` } : null,
    ].filter(Boolean));
    // the mysteries
    setScene('hall', false, true); setCast([]);
    const ml = [];
    for (const m of S.mysteries) ml.push({ text: st.mysteries.find(x => x.id === m.id).reveal[m.x] });
    if (T.p2) ml.push({ text: st.twists.poison.reveal[T.p2.who] });
    if (ml.length) await say(ml);
    await say([{ text: st.coda }]);
    // the score
    const sc = E.score(st, S, a);
    const R = rec(); const r = R[st.id] = R[st.id] || { plays: 0, win: 0, best: '-' };
    r.plays++; if (hit) r.win++;
    const order = ['S', 'A', 'B', 'C', 'D', '-']; if (order.indexOf(sc.rank) < order.indexOf(r.best)) r.best = sc.rank;
    try { localStorage.setItem(REC, JSON.stringify(R)); } catch (e) {}
    clearSave();
    const secrets = npcs().filter(id => S.people[id].secret).map(id => `<div class="li"><b>${esc(ch(id).short)}</b>：${esc(ch(id).secrets.find(s => s.id === S.people[id].secret.id).confess)}</div>`).join('');
    const v = await sheet(`<h3 style="text-align:center">${hit ? '解決' : '未解決'}　<small style="font:500 15px var(--ui);color:var(--mute)">犯人は${esc(ch(c).name)}</small></h3>
      <div class="rank">${sc.rank}</div>
      <table class="sc-t">${sc.rows.map(x => `<tr class="${x.ok ? 'ok' : 'ng'}"><td>${x.ok ? '○' : '×'}</td><td>${esc(x.name)}</td><td>${x.pts}/${x.max}</td></tr>`).join('')}<tr class="sum"><td></td><td>合計</td><td>${sc.pts}/${sc.max}</td></tr></table>
      ${secrets ? `<details class="secrets"><summary>それぞれの秘密</summary>${secrets}</details>` : ''}
      <div class="foot"><button class="btn" data-a="title">タイトルへ</button><button class="btn pri" data-a="again">もう一度（真相は変わる）</button></div>`, box => box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => closeSheet(b.dataset.a)));
    if (v === 'again') buildSetup(); else buildTitle();
  }

  /* ---------- help and options ---------- */
  function showRules(first) {
    return sheet(`<h3>遊び方</h3>
      <p>嵐に閉ざされた孤島の洋館で、館の主が殺された。あなたは、居合わせた客のひとりを演じる。二日のあいだに手がかりを集め、三日目の朝、犯人と真相を答える。犯人も、動機も、謎の答えも、遊ぶたびに変わる。</p>
      <div class="promise"><b>一、痕跡は嘘をつかない</b>現場に残った足跡・匂い・手の跡は、犯人のもの。手帳の「人物」で、皆の特徴と見くらべる。</div>
      <div class="promise"><b>二、物は嘘をつくことがある</b>落ちていた持ち物は、本当に落としたのかもしれないし、罪を着せるために置かれたのかもしれない。</div>
      <div class="promise"><b>三、人は他人のことでは嘘をつかない</b>誰かを見たという話は本当。ただし、自分がどこにいたかは、秘密のために偽ることがある。犯人だけは何でも偽る。</div>
      <p><b>昼</b>　場所を調べる（手がかりが見つかる）・話を聞く（その人の夜の足取りと、見た人）。どちらも回数に限りがある。</p>
      <p><b>夕刻の話し合い</b>　皆の言い分が手帳の「足取り」に並ぶ。言い分と、ほかの人の目撃が食い違えば、矛盾を突ける。嘘を暴かれた者は、本当の居場所と秘密を打ち明ける。</p>
      <p><b>三日目</b>　犯人・動機・凶器・時刻と、いくつかの謎に答える。あなたの役だけの目的もある（ハンドアウト）。</p>
      <p><b>キー</b>　Enter・スペース：文章を送る　F：フルスクリーン</p>
      <div class="foot"><button class="btn pri" data-x>${first ? '幕を開ける' : '閉じる'}</button></div>`, box => box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet(true)));
  }
  function showOpts() {
    const seg = (k, vals) => `<div class="seg" data-k="${k}">${vals.map(([v, t]) => `<button data-v="${v}" class="${String(pref[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    sheet(`<h3>設定</h3>
      <div class="set-row"><span>文字の速さ</span>${seg('speed', [[0, 'ゆっくり'], [1, 'ふつう'], [2, 'はやい'], [3, '一瞬']])}</div>
      <div class="set-row"><span>動き</span>${seg('anim', [[true, 'あり'], [false, 'なし']])}</div>
      <div class="set-row"><span>人形の名札</span>${seg('names', [[true, 'いつも'], [false, '話すとき']])}</div>
      <div class="set-row"><span>音</span><div class="seg" data-k="snd"><button data-v="1" class="${SND.on ? 'on' : ''}">あり</button><button data-v="0" class="${SND.on ? '' : 'on'}">なし</button></div></div>
      <div class="set-row"><span>音楽</span><div class="seg" data-k="bgm"><button data-v="1" class="${SND.musicOn ? 'on' : ''}">あり</button><button data-v="0" class="${SND.musicOn ? '' : 'on'}">なし</button></div></div>
      <div class="foot" style="justify-content:space-between;align-items:center">${S && G.scr === 'play' ? '<button class="btn" data-quit>中断してタイトルへ</button>' : '<span></span>'}<button class="btn pri" data-x>閉じる</button></div>`, box => {
      box.querySelectorAll('[data-x]').forEach(b => b.onclick = () => closeSheet());
      box.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => {
        const k = s.dataset.k, v = b.dataset.v;
        if (k === 'snd') SND.set(v === '1'); else if (k === 'bgm') SND.setMusic(v === '1'); else pref[k] = v === 'true' ? true : v === 'false' ? false : +v;
        savePref(); s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        document.body.classList.toggle('anim-off', !pref.anim); document.body.classList.toggle('show-names', !!pref.names);
      }));
      const q = box.querySelector('[data-quit]'); if (q) q.onclick = () => { closeSheet(); save(); buildTitle(); };
    });
  }
  $('btnHelp').onclick = () => showRules(false);
  $('btnOpt').onclick = showOpts;
  $('hbLogo').onclick = e => { e.preventDefault(); if (G.scr === 'play') save(); buildTitle(); };

  /* ---------- resume ---------- */
  async function resume() {
    const sv = loadSave(); if (!sv) return;
    S = sv.S; st = window.SS_CASES[S.case]; G.loc = (sv.ui || {}).loc || 'hall'; G.diff = S.diff;
    scr('play'); palette(st); hud();
    SND.music(S.phase === 'meeting' ? 'meeting' : 'story', 1);
    if (S.phase === 'prologue') return prologue();
    if (S.phase === 'morning' && S.day === 1) return morning();
    if (S.phase === 'invest' || S.phase === 'morning') return hub();
    if (S.phase === 'meeting') { setScene('hall', false, true); setCast(alive()); return debate(); }
    if (S.phase === 'night') return night2();
    if (S.phase === 'solve' || S.phase === 'end') return solve();
  }

  /* ---------- wiring ---------- */
  $('tNew').onclick = () => { SND.unlock(); buildSelect(); };
  $('tCont').onclick = () => { SND.unlock(); resume(); };
  $('tHelp').onclick = () => showRules(false);
  $('selBack').onclick = buildTitle;
  $('setBack').onclick = buildSelect;
  $('setGo').onclick = () => { SND.unlock(); start(); };
  addEventListener('resize', () => { if (G.scr === 'play') { if (!PCQ.matches) document.documentElement.style.setProperty('--nbW', '0px'); else if (document.body.classList.contains('nb-open')) document.documentElement.style.setProperty('--nbW', '420px'); layoutDock(); if (S) renderRoster(); } });
  PCQ.addEventListener?.('change', () => layoutDock());
  window.SSGame = { get S() { return S; }, get st() { return st; }, G, buildSelect, buildSetup, start, hub, meeting, debate, solve, reveal, resume, setNb };
  buildTitle();
})();
