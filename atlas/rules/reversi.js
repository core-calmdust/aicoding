/* =====================================================================
   Reversi rules — a guided tour on the 3D table, told by the guide
   character (Flipturtle). Built from the full game's illustrated rules
   (reversi/i18n.js rl.*), turned into a short hands-on scenario.
   Contract: AtlasRules[id] = { start(ctx) → { stop() } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onClose() }
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-disc.webp';
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const flipsOf = (cells, sq, color) => {
    if (cells[sq]) return [];
    const opp = 3 - color, r0 = sq >> 3, c0 = sq & 7, out = [];
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc; const line = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === color) out.push(...line);
    }
    return out;
  };
  const legal = (cells, color) => { const m = []; for (let s = 0; s < 64; s++) if (!cells[s] && flipsOf(cells, s, color).length) m.push(s); return m; };
  const sq = n => (+n[1] - 1) * 8 + (n.charCodeAt(0) - 97);
  const pos = rows => rows.join('').split('').map(ch => ch === 'B' ? 1 : ch === 'W' ? 2 : 0);
  const INIT = pos(['........', '........', '........', '...WB...', '...BW...', '........', '........', '........']);
  const RL = {   // same diagrams as the full game's rules page
    flip: pos(['........', '........', '........', '..BWWW..', '........', '........', '........', '........']),
    multi: pos(['........', '...B....', '...W....', '....WB..', '..WW....', '.B......', '........', '........']),
    no: pos(['........', '.BW.W...', '........', '..BWW...', '........', '...WW...', '........', '........']),
    pass: pos(['........', '...W....', '...W.W..', '..WWW.W.', '...WBW.B', '.B.BBBBB', '..BBBBBB', '..BBBBBB']),
    end: pos(['BBBBBBBW', 'BBWWWBBW', 'BBBBBBBW', 'BBBBWWBW', 'BWBBWBBW', 'BBWWWWWW', 'BBBWWWBW', 'WWWWWWBW']),
  };

  /* the scenario. say = before, done = after the player's move (interactive steps) */
  const TXT = {
    ja: {
      name: 'リバガメ', title: 'リバーシのルール', next: 'つぎへ', back: 'もどる', skip: 'とじる', start: 'あそんでみる', again: 'もういちど',
      tap: '光っているマスをタップ', nope: 'そこは はさめないよ〜。✕のマスは打てないんだ。',
      s: [
        { say: 'やあ、ぼくは<b>リバガメ</b>！ リバーシのルールを、この盤でいっしょにたしかめよう。' },
        { say: '盤は 8×8 の<b>64マス</b>。まん中に黒と白を2個ずつ、ななめに置いてスタート。先に打つのは<b>黒</b>だよ。' },
        { say: '打てるのは、相手の石を<b>1個以上はさめる</b>マスだけ。光っている4か所のどれかをタップしてみて！', done: 'やったね！ はさまれた白が、黒にクルッとひっくり返ったよ。' },
        { say: '一直線に何個ならんでいても、はさめば<b>全部</b>返るんだ。光っているマスに打ってみよう！', done: '3個まとめてクルクルッ！ 気持ちいいでしょ？' },
        { say: '縦・横・ななめ、はさめた方向が<b>いくつあっても</b>同時に返るよ。ここに打つとどうなるかな？', done: 'いろんな方向が一度に返ったね。はさんでいない石は返らないよ。' },
        { say: '自分の石が先にないときや、間に<b>空きマス</b>があるときは、はさめないから打てない（✕）。返った石で連鎖することもないよ。' },
        { say: '打てる場所がないときは<b>パス</b>。この盤では白がどこにも打てないから、黒がもう1回打つんだ。' },
        { say: '盤が埋まるか、どちらも打てなくなったら<b>おしまい</b>。石が多いほうの勝ち！ 同じ数なら引き分けだよ。' },
        { say: 'さいごにコツ。<b>隅</b>（金）は二度と返されない最強のマス。空いた隅のとなりの<b>X</b>（赤）と<b>C</b>（オレンジ）は、隅をとられやすいから気をつけて。' },
        { say: 'これでルールはばっちり！ さっそく遊んでみよう。わからなくなったら、いつでもまた聞いてね。' },
      ],
    },
    en: {
      name: 'Flipturtle', title: 'Reversi rules', next: 'Next', back: 'Back', skip: 'Close', start: 'Let\'s play', again: 'Again',
      tap: 'Tap a glowing square', nope: 'Nothing to sandwich there! You can\'t play on the ✕ squares.',
      s: [
        { say: 'Hi, I\'m <b>Flipturtle</b>! Let\'s go through the rules of Reversi together, right here on the board.' },
        { say: 'The board has <b>64 squares</b> (8×8). Two black and two white discs start diagonally in the middle, and <b>Black</b> moves first.' },
        { say: 'You can only play where you <b>sandwich at least one</b> of your opponent\'s discs. Tap one of the four glowing squares!', done: 'Nice! The sandwiched white disc flipped over to black.' },
        { say: 'However many discs are in the line, <b>all</b> of them flip when you sandwich them. Try the glowing square!', done: 'Three at once — flip, flip, flip!' },
        { say: 'Across, up and down, diagonal — <b>every</b> direction you sandwich flips at the same time. What happens here?', done: 'Lots of directions flipped together. Discs that aren\'t sandwiched stay put.' },
        { say: 'If there\'s no disc of yours at the far end, or an <b>empty square</b> in between, nothing is sandwiched and you can\'t play there (✕). Flips never chain.' },
        { say: 'With no legal move you must <b>pass</b>. Here White can\'t move anywhere, so Black plays again.' },
        { say: 'The game <b>ends</b> when the board is full or nobody can move. More discs wins — the same number is a draw.' },
        { say: 'One last tip: <b>corners</b> (gold) can never be flipped. The <b>X</b> (red) and <b>C</b> (orange) squares next to an empty corner often give it away.' },
        { say: 'That\'s all the rules! Let\'s play a game. Ask me again any time.' },
      ],
    },
  };
  // board, marks and interactivity of each step
  const STEPS = [
    { cells: INIT },
    { cells: INIT, glow: ['d4', 'e4', 'd5', 'e5'] },
    { cells: INIT, play: 'any' },
    { cells: RL.flip, play: ['g4'] },
    { cells: RL.multi, play: ['d4'] },
    { cells: RL.no, xs: ['f2', 'c6', 'f6'], rings: true },
    { cells: RL.pass, tag: 'PASS' },
    { cells: RL.end, count: true },
    { cells: Array(64).fill(0), tips: true },
    { cells: INIT, last: true },
  ];

  /* ---------- little sounds: wooden "tok" when a disc lands, a click per flip, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1) {   // disc on felt-on-wood: a filtered knock + a low body thump
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900 * pitch; bp.Q.value = 1.4;
      const g = C.createGain(); g.gain.setValueAtTime(.55 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .07); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(190 * pitch, t); o.frequency.exponentialRampToValueAtTime(90 * pitch, t + .09);
      og.gain.setValueAtTime(.35 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .14);
    }
    function blip() {   // one syllable of the guide's voice
      const C = on && ac(); if (!C) return; const t = C.currentTime, f = 560 + Math.random() * 260;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
      lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
    }
    return { tok, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();
  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.reversi(true); T3.show('reversi', board); T3.play(true);
    const S = board.userData.S, Y = board.userData.top, cs = S / 8;
    const W = T3.M({ color: 0xf3f0e6, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 }), B = T3.M({ color: 0x111215, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 });
    const P = q => [T3.cellPos(8, S, q & 7), T3.cellPos(8, S, q >> 3)];
    const marks = new TH.Group(); board.add(marks);
    let discs = {}, cells = [], step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    function makeDisc(q, color) {
      const g = new TH.Group(), top = T3.bevelDisc(.42, .1, W), bot = T3.bevelDisc(.42, .1, B);
      top.position.y = .1; g.add(bot, top); g.position.y = -.1;
      const inner = new TH.Group(); inner.add(g); const outer = new TH.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -.098; outer.add(ao);
      const [x, z] = P(q); outer.position.set(x, Y + .1, z); inner.rotation.x = color === 1 ? Math.PI : 0;
      board.add(outer); return (discs[q] = { outer, inner, color });
    }
    function drop(q, color, delay = 0, h = 2.2, snd = false) { const d = makeDisc(q, color); d.outer.visible = false; later(() => { d.outer.visible = true; anim(280, k => { d.outer.position.y = Y + .1 + (1 - k) * (1 - k) * h; }, () => { if (snd) SFX.tok(1, 1); }); }, delay); }
    function flip(q, color, delay) {
      const d = discs[q]; d.color = color; const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
      later(() => anim(420, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + .1 + Math.sin(k * Math.PI) * .8; }, () => SFX.tok(.45, 1.35 + Math.random() * .15)), delay);
    }
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function tile(q, color, op = .5, h = .02) { const m = new TH.Mesh(new TH.BoxGeometry(cs * .92, h, cs * .92), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false })); const [x, z] = P(q); m.position.set(x, Y + .012, z); marks.add(m); return m; }
    function ring(q) { const m = new TH.Mesh(new TH.CylinderGeometry(.17, .17, .02, 24), new TH.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .8 })); const [x, z] = P(q); m.position.set(x, Y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    function cross(q) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff4d4d }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(cs * .62, .03, .07), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = P(q); g.position.set(x, Y + .03, z); marks.add(g); return g; }
    // pulse the glowing marks
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); marks.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(.85 + k * .3); m.material.opacity = .45 + k * .45; } }); requestAnimationFrame(pulse); })();

    function setBoard(next) {   // swap the position: old discs hop away, new ones drop in
      Object.values(discs).forEach(d => board.remove(d.outer)); discs = {};
      cells = next.slice(); let i = 0;
      cells.forEach((c, q) => { if (c) drop(q, c, 40 + (i++) * 14, 1.2); });
    }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    let typeT = 0;
    function say(html) {   // typed speech, tap the bubble to finish
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function buttons() {
      const st = STEPS[step], wait = st.play && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶';
      nx.disabled = wait; nx.classList.toggle('wait', wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false;
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      setBoard(st.cells);
      const intro = 220 + cells.filter(Boolean).length * 14;
      later(() => {
        if (st.glow) st.glow.forEach(n => { const m = tile(sq(n), 0xffe27a, .5); m.userData.pulse = true; });
        if (st.play) (st.play === 'any' ? legal(cells, 1) : st.play.map(sq)).forEach(ring);
        if (st.rings) legal(cells, 1).forEach(ring);
        if (st.xs) st.xs.forEach(n => cross(sq(n)));
        if (st.tips) { ['a1', 'h1', 'a8', 'h8'].forEach(n => tile(sq(n), 0xffc928, .92)); ['b2', 'g2', 'b7', 'g7'].forEach(n => tile(sq(n), 0xff4040, .85)); ['b1', 'a2', 'g1', 'h2', 'a7', 'b8', 'h7', 'g8'].forEach(n => tile(sq(n), 0xff8a1e, .8)); }
        if (st.tag) $('.cnt').innerHTML = `<span class="tag">○ ${st.tag}</span>`;
        if (st.count) { const b = cells.filter(c => c === 1).length, w = cells.filter(c => c === 2).length; $('.cnt').innerHTML = `<span class="sc"><i class="dk b"></i><b data-n="${b}">0</b></span><span class="vs">:</span><span class="sc"><i class="dk w"></i><b data-n="${w}">0</b></span>`; $('.cnt').querySelectorAll('b').forEach(x => { const N = +x.dataset.n; anim(900, k => { x.textContent = Math.round(N * (1 - Math.pow(1 - k, 3))); }); }); }
      }, intro);
      say(L.s[step].say); buttons();
    }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; const p = T3.pick(e, Y); if (!p) return;
      const c = Math.floor((p.x + S / 2) / cs), r = Math.floor((p.z + S / 2) / cs); if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const q = r * 8 + c;
      if (st.xs && st.xs.map(sq).includes(q)) { say(L.nope); return; }
      if (!(st.play || st.rings) || played) return;
      const ok = st.play && st.play !== 'any' ? st.play.map(sq) : legal(cells, 1);
      if (!ok.includes(q)) return;
      const fl = flipsOf(cells, q, 1); busy = true; played = true; clearMarks();
      cells[q] = 1; fl.forEach(s => { cells[s] = 1; });
      drop(q, 1, 0, 2.2, true);
      fl.sort((a, b) => Math.hypot((a & 7) - c, (a >> 3) - r) - Math.hypot((b & 7) - c, (b >> 3) - r)).forEach((s, i) => flip(s, 1, 240 + i * 90));
      later(() => { busy = false; if (L.s[step].done) say(L.s[step].done); buttons(); if (!st.play) played = false; }, 400 + fl.length * 90 + 400);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => go(step - 1);
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / → next, ← back (the next button's rules apply: an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();   // no double-press via the focused button
      if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); el.remove(); },
      panel: el,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.reversi = { start };
})();
