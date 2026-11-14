/* =====================================================================
   Shanghai rules — a guided tour on the 3D table (the white tiles of atlas/models/shanghai.js on their leather mat),
   told by the game's own guide, クジャクパイ (Peacotile, av/peacock-0: a plush peacock whose tail is a fan of tiles).
   A short hands-on course: what the game is, take a pair, a tile is free when its left or right is open, a tile with
   one on top waits, flowers and seasons, clear a little pyramid, and the tools (hint, undo, shuffle) with the modes.
   Finishing the course gives the guide's N avatar (window.ShanghaiReward, atlas/games/shanghai.js).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Tiles as [x2, y2, z, face] (half-tile units, as ShanghaiCore.LAYOUTS; faces: 0–8 萬子 · 9–17 筒子 · 18–26 索子 ·
   27–30 東南西北 · 31–33 白發中 · 34–37 梅蘭菊竹 · 38–41 春夏秋冬).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/peacock-0.webp';
  const K = () => window.ShanghaiCore;
  // act: 'pair' (take the glowing pair) · 'clear' (take them all) · 'deal' (a little pyramid dealt solvable: take them all)
  const STEPS = [
    { show: 'petit' },
    { t: [[0, 0, 0, 27], [4, 0, 0, 9], [8, 0, 0, 27], [12, 0, 0, 22]], act: 'pair', glow: [0, 2] },
    { t: [[0, 0, 0, 33], [2, 0, 0, 0], [4, 0, 0, 13], [6, 0, 0, 13], [8, 0, 0, 0], [10, 0, 0, 33]], act: 'clear' },
    { t: [[0, 0, 0, 29], [2, 0, 0, 20], [4, 0, 0, 29], [2, 0, 1, 32], [8, 0, 0, 32], [10, 0, 0, 20]], act: 'clear' },
    { t: [[0, 0, 0, 34], [4, 0, 0, 38], [8, 0, 0, 36], [12, 0, 0, 41]], act: 'clear' },
    { deal: [[0, 0, 0], [2, 0, 0], [4, 0, 0], [0, 2, 0], [2, 2, 0], [4, 2, 0], [1, 1, 1], [3, 1, 1]], act: 'clear' },
    { show: 'pyramid', last: true },
  ];

  const TXT = {
    ja: { name: 'クジャクパイ', next: 'つぎへ', back: 'もどる', start: '遊んでみる', again: 'もういちど', tap: '牌をタップしてね', blocked: 'その牌は左右どちらもふさがっているよ', under: 'その牌は上に牌が乗っているよ', want: '今回は光っている2枚を取ってね', retry: '取れる組がなくなっちゃった。もう一度やってみよう！', gift: 'ルールコースのおみやげに、ぼくのアバターをどうぞ！',
      s: [
      { say: 'やあ！ ぼくは<b>クジャクパイ</b>。しっぽは麻雀の牌でできてるんだ、きれいでしょ？ 今日は麻雀牌のひとり遊び<b>上海</b>を覚えよう。積み上げた牌から<b>同じ絵の2枚</b>を取っていって、<b>全部なくなったらクリア</b>だよ。' },
      { say: '取り方はかんたん。<b>同じ絵の牌を2枚</b>、順番にタップするだけ。光っている<b>「東」</b>の2枚をタップしてみて！', done: 'スッと消えたね！ これが基本の1手だよ。' },
      { say: '牌が横に並んでいたら、<b>左か右のどちらかが空いている牌</b>しか取れないんだ。両側がふさがった牌はまだ取れないよ。端から順に、<b>全部取って</b>みて！', done: 'おみごと！ 端を取ると、となりの牌が自由になるんだ。' },
      { say: 'それから、<b>上に牌が乗っている牌</b>も取れないよ。上の牌を先に取ってあげよう。並んだ6枚を<b>全部取って</b>みて！', done: 'ばっちり！ 下の牌を出すには、まず上から。積み方を見るのが大事なんだ。' },
      { say: '<b>花</b>（梅・蘭・菊・竹）と<b>季節</b>（春・夏・秋・冬）だけは特別。絵が違っても、<b>花どうし・季節どうし</b>なら組になるよ。4枚とも取ってみて！', done: 'そのとおり！ 梅と菊、春と冬で取れたね。' },
      { say: 'じゃあ小さなピラミッドで練習しよう。取れる組が何組もあるときは、<b>上の段</b>や<b>ほかの牌をふさいでいる牌</b>から取るのがコツ。<b>全部取って</b>みて！', done: '全部取れた！ その調子なら、もっと大きな山もいけるよ。' },
      { say: 'これでルールはばっちり！ 困ったら<b>ヒント</b>、間違えたら<b>待った</b>。取れる組がなくなったら<b>シャッフル</b>できるけど、1回ごとに<b>タイムが10秒</b>増えるよ。10の配置で遊ぶ<b>フリー</b>と、12星座をめぐる<b>120のステージ</b>が待ってる。ステージをクリアするとコインがもらえて、星座を進めるとぼくの別の姿にも会えるよ。さあ、遊んでみよう！' },
    ] },
    en: { name: 'Peacotile', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a tile', blocked: 'That tile is blocked on both sides', under: 'That tile has another one on top', want: 'This time, take the two glowing tiles', retry: 'No pairs left — let’s try it again!', gift: 'A souvenir for finishing the rules course: my avatar!',
      s: [
      { say: "Hi! I'm <b>Peacotile</b>. My tail is made of mahjong tiles — pretty, right? Today let's learn <b>Shanghai</b>, the one-player game played with mahjong tiles. Take <b>two tiles with the same face</b> from the stack, pair by pair, and when <b>they're all gone, you win</b>." },
      { say: 'Taking tiles is easy: just tap <b>two tiles with the same face</b>, one after the other. Tap the two glowing <b>“East”</b> tiles!', done: 'Poof, gone! That’s one move.' },
      { say: 'When tiles sit side by side, you can only take a tile whose <b>left or right side is open</b>. A tile blocked on both sides has to wait. Work in from the ends and <b>take them all</b>!', done: 'Well done! Taking an end tile frees the one next to it.' },
      { say: 'And a tile with <b>another tile on top</b> can’t be taken either — take the top one first. <b>Take all six</b>!', done: 'Perfect! To reach a tile below, start from the top. Reading the stack is the key.' },
      { say: 'The <b>flowers</b> (plum, orchid, chrysanthemum, bamboo) and the <b>seasons</b> (spring, summer, autumn, winter) are special: <b>any flower pairs with any flower</b>, any season with any season, even with different pictures. Take all four!', done: 'Exactly! Plum with chrysanthemum, spring with winter.' },
      { say: 'Now a little pyramid for practice. When several pairs are open, take the ones on the <b>top layer</b> or the ones <b>blocking other tiles</b> first. <b>Take them all</b>!', done: 'All gone! At this rate you’ll beat the big stacks too.' },
      { say: 'Now you know the rules! Stuck? Use a <b>hint</b>. Made a slip? <b>Undo</b>. When no pairs are left you can <b>shuffle</b>, but each shuffle adds <b>10 seconds</b> to your time. <b>Free play</b> has ten layouts, and <b>120 stages</b> await across the twelve constellations. Clearing stages earns coins, and going further lets you meet my other looks. Let’s play!' },
    ] },
  };

  /* ---------- little sounds: a click of a tile, a pair going, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const tap = () => { tone(2600, 2100, .035, .07, 'triangle'); tone(1400, 1100, .05, .04, 'sine', .005); };
    const pair = () => { tone(880, 1320, .12, .05, 'sine'); tone(1320, 1760, .14, .04, 'sine', .07); };
    const nope = () => tone(260, 200, .1, .05, 'triangle');
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 700 + Math.random() * 300; tone(f, f * (Math.random() < .5 ? 1.22 : .84), .06, .06, 'triangle'); };
    return { tap, pair, nope, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = (window.SHANGHAI_RULES_I18N && SHANGHAI_RULES_I18N[ctx.lang]) || TXT[ctx.lang] || TXT.en, M3 = T3.shanghai;
    let step = 0, stopped = false, busy = false, played = false, sel = -1, timers = [];
    let B = null;   // the board of this step: { g, im, shm, P, face, alive, G, pos, st8, base, zMax, W, D }
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const TW = M3.TW, TD = M3.TD, THh = M3.TH;
    const left = () => B.alive.reduce((s, v) => s + v, 0);

    /* ---------- the board of a step: the mat sized to the tiles, one InstancedMesh, the soft shades of upper tiles ---------- */
    function dispose() {
      if (!B) return;
      if (B.im.userData.dispose) B.im.userData.dispose(); if (B.shm.userData.dispose) B.shm.userData.dispose();
      B = null;
    }
    function build(tiles, face) {
      dispose();
      const P = tiles.map(p => [p[0], p[1], p[2]]), n = P.length;
      const mx = Math.min(...P.map(p => p[0])), my = Math.min(...P.map(p => p[1])); P.forEach(p => { p[0] -= mx; p[1] -= my; });
      const xs = P.map(p => p[0]), ys = P.map(p => p[1]), zMax = Math.max(...P.map(p => p[2]));
      const W = (Math.max(...xs) / 2 + 1) * TW, D = (Math.max(...ys) / 2 + 1) * TD;
      const g = new TH.Group(), mat = M3.mat(W, D), base = mat.userData.top; g.add(mat);
      const im = M3.tiles(n); g.add(im);
      const shI = P.map((p, i) => p[2] > 0 ? i : -1).filter(i => i >= 0), shOf = {}; shI.forEach((i, k) => { shOf[i] = k; });
      const shm = M3.shades(Math.max(1, shI.length)); if (!shI.length) shm.count = 0; g.add(shm);
      const pos = P.map(([x, y, z]) => [(x / 2 + .5) * TW - W / 2, base + z * THh, (y / 2 + .5) * TD - D / 2]);
      B = { g, im, shm, shOf, P, face: face.slice(), alive: new Array(n).fill(1), G: K().links(P), pos, st8: P.map(() => ({ lift: 0, s: 1, dy: 0, rz: 0, dx: 0, dz: 0 })), base, zMax, W, D, n, glow: [] };
      for (let i = 0; i < n; i++) im.userData.setFace(i, B.face[i]);
      g.userData = { top: base + THh * (zMax + 1), _rb: Math.max(W, D) / 2 };
      T3.show('shanghai', g); T3.play(true);
      if (T3.fit) T3.fit({ w: Math.max(W + 1.6, 6.2), d: Math.max(D + 1.8, 4.6), y: base + THh, pitch: 1.12 });
      paintAll();
    }
    const o3 = new TH.Object3D(), o4 = new TH.Object3D(), col = new TH.Color();
    function place(i) {
      const S = B.st8[i], [x, y, z] = B.pos[i];
      o3.position.set(x + S.dx, y + S.lift + S.dy, z + S.dz); o3.rotation.set(0, 0, S.rz); o3.scale.setScalar(S.s); o3.updateMatrix(); B.im.setMatrixAt(i, o3.matrix);
      const k = B.shOf[i]; if (k === undefined) return;
      const on = B.alive[i] && S.s > .5 && S.dy < .05;
      o4.position.set(x + .05, y + .003, z + .07); o4.scale.setScalar(on && S.lift < .45 ? 1 + Math.min(.6, S.lift * 1.2) : .0001); o4.updateMatrix(); B.shm.setMatrixAt(k, o4.matrix); B.shm.instanceMatrix.needsUpdate = true;
    }
    const free = i => K().isFree(B.G, B.alive, i);
    function tint(i) {
      const fr = B.st8[i].fly || (B.alive[i] && free(i));
      let r = 1, gg = 1, b = 1;
      if (i === sel) { r *= 1.04; gg *= .93; b *= .66; }
      if (B.glow.includes(i) && B.alive[i]) { r *= 1.05; gg *= .82; b *= .5; }
      const k = fr || !STEPS[step].act ? 1 : .6;
      col.setRGB(r * k, gg * k, b * k); B.im.setColorAt(i, col);
    }
    function paintAll() { if (!B) return; for (let i = 0; i < B.n; i++) { place(i); tint(i); } B.im.instanceMatrix.needsUpdate = true; if (B.im.instanceColor) B.im.instanceColor.needsUpdate = true; kick(200); }
    function retint() { for (let i = 0; i < B.n; i++) tint(i); if (B.im.instanceColor) B.im.instanceColor.needsUpdate = true; kick(); }
    // the tiles come down layer by layer (only when the step's tiles differ from the ones on the table)
    function drop() {
      const order = B.P.map((p, i) => i).sort((a, b) => B.P[a][2] - B.P[b][2] || B.P[a][1] - B.P[b][1] || B.P[a][0] - B.P[b][0]);
      const gap = Math.min(40, 700 / B.n), T0 = performance.now(), dur = 300, total = gap * B.n + dur, bb = B;
      order.forEach((i, k) => { bb.st8[i].dy = 3; bb.st8[i].s = .001; bb.st8[i].k0 = k * gap; });
      paintAll();
      (function s(now) {
        if (stopped || B !== bb) return; const tt = now - T0;
        order.forEach(i => { const q = Math.min(1, Math.max(0, (tt - bb.st8[i].k0) / dur)), e = 1 - Math.pow(1 - q, 3); bb.st8[i].dy = (1 - e) * 2.4; bb.st8[i].s = q > 0 ? 1 : .001; place(i); });
        bb.im.instanceMatrix.needsUpdate = true; kick(120);
        if (tt < total) requestAnimationFrame(s); else { order.forEach(i => { bb.st8[i].dy = 0; bb.st8[i].s = 1; }); paintAll(); }
      })(T0);
      let tick = 0; const iv = setInterval(() => { if (stopped || ++tick > Math.min(8, B ? B.n : 0)) { clearInterval(iv); return; } SFX.tap(); }, 70);
      return total;
    }
    function setup(st) {
      if (st.show) { const P = K().LAYOUTS[st.show], d = K().deal(P, st.show === 'petit' ? 11 : 23); build(P.map(p => p.slice()), d.face); }
      else if (st.deal) { const d = K().deal(st.deal, 5 + (setup.n = (setup.n || 0) + 1) * 7919); build(st.deal, d.face); }
      else build(st.t.map(p => p.slice(0, 3)), st.t.map(p => p[3]));
      B.glow = (st.glow || []).slice();
      return drop();
    }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = window.TapWord ? TapWord.fix(html, ctx.lang) : html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 34);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function buttons() {
      const st = STEPS[step], wait = st.act && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = (window.TapWord ? x => TapWord.fix(x, ctx.lang) : x => x)(st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶');
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    // a correct task moves on by itself once the guide's line has been read (the common rule: autoNext)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(4800, 1600 + n * 45); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && played && !STEPS[step].last) go(step + 1); }, ms); }
    function go(n, quiet) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = true; sel = -1;
      timers.forEach(clearTimeout); timers = [];
      $('.cnt').innerHTML = '';
      const ms = setup(STEPS[step]);
      later(() => { busy = false; retint(); }, Math.min(ms, 900));
      if (!quiet) say(L.s[step].say);
      buttons();
      if (STEPS[step].last) gift();
    }
    // the last page: the course is done — the guide's N avatar (once), and the rules count as seen for the achievement
    function gift() {
      try { localStorage.setItem('aicoding-shanghai-rules-seen', '1'); } catch (e) {}
      const R = window.ShanghaiReward; if (!R || !R.grant) return;
      later(() => { if (R.grant(0, ctx.lang)) { $('.cnt').innerHTML = `<div style="margin-top:8px;font-weight:800;color:#1f6a4c">🎁 ${L.gift}</div>`; } }, 900);
    }
    function finish() {
      played = true; busy = false; sel = -1;
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime(); buttons(); autoNext();
    }
    function fail() { busy = true; say(L.retry); later(() => go(step, true), 1900); }

    /* ---------- input: tap a free tile, then its match ---------- */
    function tileAt(e) {
      for (let z = B.zMax; z >= 0; z--) {
        const p = T3.pick(e, B.base + (z + 1) * THh); if (!p) continue;
        let best = -1, bd = 9;
        for (let i = 0; i < B.n; i++) { if (!B.alive[i] || B.P[i][2] !== z) continue; const [x, , zz] = B.pos[i], dx = Math.abs(p.x - x), dz = Math.abs(p.z - zz); if (dx < TW * .5 && dz < TD * .5 && dx + dz < bd) { bd = dx + dz; best = i; } }
        if (best >= 0) return best;
      }
      return -1;
    }
    function lift(i, h, ms) { const S = B.st8[i], h0 = S.lift, bb = B; anim(ms || 120, k => { if (B !== bb || !bb.alive[i]) return; S.lift = h0 + (h - h0) * io(k); place(i); bb.im.instanceMatrix.needsUpdate = true; }); }
    function wiggle(i) { const S = B.st8[i], bb = B; anim(260, k => { if (B !== bb) return; S.rz = Math.sin(k * Math.PI * 4) * .06 * (1 - k); place(i); bb.im.instanceMatrix.needsUpdate = true; }, () => { if (B !== bb) return; S.rz = 0; place(i); bb.im.instanceMatrix.needsUpdate = true; }); }
    function onClick(e) {
      const st = STEPS[step];
      if (busy || played || !st.act || !B || (T3.wasDrag && T3.wasDrag()) || e.target.closest('.rgd')) return;
      const i = tileAt(e);
      if (i < 0) { if (sel >= 0) { const s0 = sel; sel = -1; lift(s0, 0); tint(s0); B.im.instanceColor.needsUpdate = true; kick(); } return; }
      if (!free(i)) { SFX.nope(); wiggle(i); say(B.G.on[i].some(j => B.alive[j]) ? L.under : L.blocked); return; }
      if (sel === i) { sel = -1; lift(i, 0); tint(i); B.im.instanceColor.needsUpdate = true; kick(); return; }
      if (sel >= 0 && K().cls(B.face[sel]) === K().cls(B.face[i])) {
        if (st.act === 'pair' && !(B.glow.includes(sel) && B.glow.includes(i))) { say(L.want); return; }
        take(sel, i); return;
      }
      if (sel >= 0) { const s0 = sel; lift(s0, 0); sel = -1; tint(s0); }
      sel = i; SFX.tap(); lift(i, .14); tint(i); B.im.instanceColor.needsUpdate = true; kick();
    }
    ctx.el.addEventListener('click', onClick);
    function take(a, b) {
      sel = -1; B.alive[a] = B.alive[b] = 0; SFX.pair();
      const bb = B, A = bb.st8[a], Bs = bb.st8[b], ax = bb.pos[a], bx = bb.pos[b], mx = (ax[0] + bx[0]) / 2, mz = (ax[2] + bx[2]) / 2, my = Math.max(ax[1], bx[1]) + 1.1, la = A.lift, lb = Bs.lift;
      A.fly = Bs.fly = 1;
      anim(260, k => {
        if (B !== bb) return; const q = io(k), m = Math.max(0, (k - .25) / .75), s = Math.max(.001, 1 - Math.max(0, (k - .5) / .5));
        A.lift = la + (my - ax[1] - la) * Math.min(1, k * 1.8); A.dx = (mx - ax[0]) * io(m) * .7; A.dz = (mz - ax[2]) * io(m) * .7; A.s = s; A.rz = q * .4; place(a);
        Bs.lift = lb + (my - bx[1] - lb) * Math.min(1, k * 1.8); Bs.dx = (mx - bx[0]) * io(m) * .7; Bs.dz = (mz - bx[2]) * io(m) * .7; Bs.s = s; Bs.rz = -q * .4; place(b);
        bb.im.instanceMatrix.needsUpdate = true;
      }, () => { if (B !== bb) return; [A, Bs].forEach(S => { S.fly = 0; S.s = .001; }); place(a); place(b); bb.im.instanceMatrix.needsUpdate = true; retint(); });
      retint(); after();
    }
    function after() {
      const st = STEPS[step];
      if (st.act === 'pair') return finish();
      if (!left()) return finish();
      if (!K().moves(B.G, B.alive, B.face).length) return fail();
    }

    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' : '<path d="m23 9-6 6M17 9l6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    (M3.ready ? M3.ready() : Promise.resolve()).then(() => { if (!stopped) later(() => go(0), 200); });
    const dbg = { step: () => step, played: () => played, left: () => B && left(), free: () => B ? B.P.map((p, i) => i).filter(i => B.alive[i] && free(i)) : [], face: () => B && B.face.slice(),
      at: i => T3.project ? T3.project(B.pos[i][0], B.pos[i][2], B.pos[i][1] + THh) : null, take: (a, b) => take(a, b), go };
    window.__shRules = dbg;
    return {
      stop() { stopped = true; if (window.__shRules === dbg) delete window.__shRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); dispose(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.shanghai = { start };
})();
