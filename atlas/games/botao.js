/* =====================================================================
   Futebol de Botão (フチボウ・ジ・ボタン) on the portal — table play (3D only: no 2D page, like carrom).
   · Rules, physics and AI: ../botao/engine.js (BotaoEngine); the AI thinks in ../botao/worker.js.
   · Table and pieces: Table3D.MODELS.botao (atlas/models/botao.js), six tables (the 盤 row and the picker before a game).
   · You are side 0 (the near goal, attacking up the table). "First" = you kick off. Two players on one device: the table
     turns so the side with the ball is at the bottom.
   · Controls: tap / click one of your buttons to pick it (the one nearest the ball is picked for you), then pull back from
     it like a slingshot and let go. You aim the BALL (2026-11-15 ユーザー: 玉の方向とはじく方向がバラバラで直感的でない):
     the pull points the ball's way, E.ballAim finds the button's run that sends it there, and the green line is the ball's
     path to its first knock (E.ballPath). Dots: the button's run to the ball. A gold cone floats over the ball.
   · The view (2026-11-15): drag an empty spot (or with the right mouse button anywhere) to move it, the wheel / a pinch
     to zoom, the arrow keys to move it, C to come back; it follows the ball again at the next flick. V: near / whole.
     「シュート宣言」 (or S) calls a shot when the ball is in the attacking half; the defender then sets the goalkeeper in
     the small area (drag it, then 「構えOK」) and the attacker shoots.
   · Game length (the size select): halves of 3 / 5 / 10 minutes (the clock runs while you play), or first to 3 goals.
   ===================================================================== */
(function () {
  'use strict';
  const L14 = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const TXT = window.BOTAO_TXT || {};   // (atlas/games/botao-i18n.js)
  const LVD = window.BOTAO_LVD || {}, WHO = window.BOTAO_WHO || {}, HOWTO = window.BOTAO_HOWTO || {};
  function levelInfo(n, lang) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return { name: 'Lv.' + n, desc: (LVD[lang] || LVD.en || [])[b] || '', who: (WHO[lang] || WHO.en || [])[b] || '' }; }
  const SIZES = [3, 5, 10, 103];
  const tl = (l, k) => ((window.BOTAO_TXT || {})[l] || (window.BOTAO_TXT || {}).en || {})[k] || k;
  const sizeName = (z, l) => z === 103 ? tl(l, 'g3') : tl(l, 'm' + z);
  const sizeLabel = l => tl(l, 'len');
  const AC = () => window.Atlas3D.carrom;
  const mousey = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };
  const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const THEME = '#5f9e1a';

  /* ---------- a few sounds of our own: the referee's whistle, the net, the crowd's "goooal" swell ---------- */
  const SX = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    const whistle = (a, t, dur, n) => { for (let k = 0; k < (n || 1); k++) { const t0 = t + k * (dur + .08), o = a.createOscillator(), lfo = a.createOscillator(), lg = a.createGain(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 2750; lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg).connect(o.frequency); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.06, t0 + .02); g.gain.setValueAtTime(.06, t0 + dur - .04); g.gain.linearRampToValueAtTime(0, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); lfo.start(t0); o.stop(t0 + dur + .02); lfo.stop(t0 + dur + .02); } };
    const crowd = (a, t, dur, vol) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) { const k = i / d.length; d[i] = (Math.random() * 2 - 1) * Math.min(1, k * 6) * Math.pow(1 - k, 1.6); } n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .7; const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t); };
    return {
      whistle: (n, dur) => at((a, t) => whistle(a, t, dur || .28, n || 1)),
      goal: () => at((a, t) => { whistle(a, t, .45, 1); crowd(a, t + .05, 2.4, .5); }),
      net: () => at((a, t) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * .25 | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); n.buffer = b; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400; const g = a.createGain(); g.gain.value = .35; n.connect(f).connect(g).connect(a.destination); n.start(t); }),
      ooh: () => at((a, t) => crowd(a, t, 1.1, .22)),
    };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, E = window.BotaoEngine, D = E.DIM, SND = AC().SND;
    const lang = ctx.lang, L = TXT[lang] || TXT.en;
    const tx = (k, o) => { let s = L[k] != null ? L[k] : (TXT.en[k] != null ? TXT.en[k] : k); if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6)), size = SIZES.includes(+ctx.size) ? +ctx.size : 5;
    const youFirst = (+ctx.side || 1) === 1;
    const BDL = (T3.BOARDS && T3.BOARDS.botao) ? T3.BOARDS.botao.list : ['classic', 'retro', 'night', 'praia', 'madeira', 'neon'];
    let look = T3.BOARDS && T3.BOARDS.botao ? T3.BOARDS.botao.get() : 'classic';
    const board = T3.MODELS.botao(true, look); T3.show('botao', board);
    let modelKids = new Set(board.children);
    let U = board.userData; const Y = U.top, K = U.K;
    const CFEEL = { classic: 'std', retro: 'hard', night: 'precise', praia: 'power', madeira: 'aim', neon: 'finest' };
    let feel = AC().feelOf(CFEEL[look]);
    let st = null, phase = 'wait', over = false, stopped = false, busy = false, tok = 0, msg = '', ply = 0;
    let sel = -1, hov = -1, aim = null, hintMove = null, speedUp = 1, told = false;
    const hist = [], timers = [];
    const later = (f, ms) => { const my = tok; timers.push(setTimeout(() => { if (!stopped && my === tok) f(); }, ms)); };
    const human = p => pvp || p === 0;
    const nameOf = p => pvp ? tx(p === 0 ? 'home' : 'away') : p === 0 ? t('p.you') : t('p.ai');
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const wx = (x, y) => U.xz(x, y);

    /* ---------- the pieces on the table ---------- */
    let bt = [], ballG = null, kp = [];
    function build() {
      bt.forEach(g => board.remove(g)); kp.forEach(g => board.remove(g)); if (ballG) board.remove(ballG);
      bt = []; kp = [];
      for (let i = 0; i < 20; i++) { const g = U.button(i < 10 ? 0 : 1, (i % 10) + 2), sh = T3.contact(D.RB * K * 1.18, .4); sh.position.y = .003; g.add(sh); board.add(g); bt.push(g); }
      ballG = U.ball(); { const sh = T3.contact(D.RBALL * K * 1.5, .45); sh.position.y = .003; ballG.add(sh); } board.add(ballG);
      for (let s = 0; s < 2; s++) { const g = U.keeper(s), sh = T3.contact(D.KHW * K * 1.1, .35); sh.scale.set(1, 1, .5); sh.position.y = .003; g.add(sh); board.add(g); kp.push(g); }
    }
    const put = (g, x, y, h) => { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); };
    let spin = 0;
    function syncAll() {
      if (!st) return;
      st.b.forEach((b, i) => put(bt[i], b.x, b.y));
      put(ballG, st.ball.x, st.ball.y); st.k.forEach((k, s) => put(kp[s], k.x, k.y));
      kick(200);
    }
    function setLook(v) {
      if (v === look) return; look = v; feel = AC().feelOf(CFEEL[v]);
      try { if (T3.setBoard) T3.setBoard('botao', v); } catch (e) {}
      const nb = T3.MODELS.botao(true, v); modelKids.forEach(c => board.remove(c)); modelKids = new Set(nb.children); [...nb.children].forEach(c => board.add(c)); board.userData = nb.userData; U = board.userData;
      build(); syncAll(); neonTick(); if (T3.kick) T3.kick(500);
    }

    /* ---------- the camera: following the ball (an angled close view) or the whole table from above ---------- */
    const VK = 'atlas-botao-view';
    let whole = false; try { whole = localStorage.getItem(VK) === 'whole'; } catch (e) {}
    let camAt = { x: 0, y: 0 }, pan = { x: 0, y: 0 }, span = { x: 0, y: 0 };   // span: also keep this much in view (the ball and the button that plays it)   // pan: your own move of the view (drag an empty spot / WASD), cm
    const port = () => innerHeight > innerWidth * 1.05;
    function camFit(ease) {
      if (!T3.fit) return;
      if (whole) {
        const o = port() ? { w: U.W * .98, d: U.L * 1.0, y: Y, pitch: 1.42 } : { w: U.W * 1.0, d: U.L * 1.16, y: Y, pitch: 1.36 };
        if (pan.x || pan.y) { const [cx, cz] = wx(pan.x, pan.y); o.cx = cx; o.cz = cz; }
        T3.fit(o); return;
      }
      const att = phase === 'keeper' ? 0 : st ? (E.fwd(st.pos) * (pvp && st.pos === 1 ? -1 : 1)) : -1;
      const wc = Math.max((port() ? 58 : 92), span.x * 1.35 + 24), dc = Math.max((port() ? 76 : 62), span.y * 1.3 + 26);
      // the view never runs far past the end of the table (near a goal it used to show half a screen of the room)
      // (the far end looks longer in perspective, so it gets the tighter limit)
      const topSg = ((pvp && st && st.pos === 1) !== flipped) ? 1 : -1, near = D.H + (port() ? 2 : 6) - dc / 2, far = D.H + (port() ? -4 : 5) - dc / 2;
      const yMin = -Math.max(0, topSg < 0 ? far : near), yMax = Math.max(0, topSg < 0 ? near : far), xLim = Math.max(0, D.HW + 12 - wc / 2);
      const ax = Math.max(-xLim, Math.min(xLim, camAt.x + pan.x)), ay = Math.max(yMin, Math.min(yMax, camAt.y + pan.y + att * (port() ? 6 : 4)));
      // near the goal at the bottom of the screen the camera looks down more steeply (the net would hide the keeper)
      const nearY = (pvp && st && st.pos === 1 ? -1 : 1) * (flipped ? -1 : 1) * ay, steep = Math.max(0, Math.min(1, (nearY - 40) / 30));
      const w = wc * K, d = dc * K, [cx, cz] = wx(ax, ay);
      T3.fit({ w, d, y: Y, pitch: (port() ? .98 : .92) + steep * .36, cx, cz, ease: !!ease, ek: ease === 'slow' ? .035 : .08 });
    }
    function follow(x, y, ease) { camAt = { x, y }; span = { x: 0, y: 0 }; if (!whole) camFit(ease == null ? true : ease); }
    // the ball and the button about to play it, both in view (the ball can be far from every button you have)
    function frameBallAnd(i, ease) {
      if (i < 0 || !st) return follow(st.ball.x, st.ball.y, ease);
      const b = st.b[i], dx = Math.abs(b.x - st.ball.x), dy = Math.abs(b.y - st.ball.y);
      camAt = { x: (b.x + st.ball.x) / 2, y: (b.y + st.ball.y) / 2 }; span = { x: dx, y: dy };
      if (!whole) camFit(ease == null ? true : ease);
    }
    // your own look around: the view stays where you put it until the next flick (then it follows the ball again)
    function panBy(dx, dy) {
      const lim = whole ? [D.HW * .6, D.H * .6] : [D.HW + 6, D.H + 6];
      pan.x = Math.max(-lim[0] - (whole ? 0 : camAt.x), Math.min(lim[0] - (whole ? 0 : camAt.x), pan.x + dx));
      pan.y = Math.max(-lim[1] - (whole ? 0 : camAt.y), Math.min(lim[1] - (whole ? 0 : camAt.y), pan.y + dy));
      camFit(false);
    }
    function panReset(ease) { if (!pan.x && !pan.y) return; pan = { x: 0, y: 0 }; camFit(ease == null ? true : ease); }
    const onResize = () => camFit(false);
    addEventListener('resize', onResize);

    /* ---------- the guides ---------- */
    const gd = new TH.Group(); board.add(gd);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { path: basic(0xffffff, .9), hint: basic(0xff3d7f, .95), ball: basic(0x3df59a, .95), aiBall: basic(0x9fd8ff, .9), sel: basic(0xffd34d, .95), can: basic(0xffffff, .55), arrow: basic(0xffffff, .95), box: basic(0x3df59a, .18), boxL: basic(0x3df59a, .8), no: basic(0xff5a5a, .7) };
    const GEO = { bar: new TH.BoxGeometry(1, .004, 1), ring: new TH.TorusGeometry(1, .07, 6, 40), cone: new TH.ConeGeometry(.06, .16, 3), disc: new TH.CircleGeometry(1, 32) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cone.rotateX(Math.PI / 2); GEO.disc.rotateX(-Math.PI / 2);
    function clearGuides() { while (gd.children.length) gd.remove(gd.children[0]); kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return null;
      const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2);
      m.position.set(a, Y + (lift || .02), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); return m;
    }
    function dots(x0, y0, x1, y1, mat, w) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(len / 2.2)); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .6) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, w || .45, mat); } }
    // a ring on the cloth (h = 0) or round a button at half its height (h = BMID), so it sits round the piece as you see it
    const BMID = .7;   // at the height of the button's top face: the ring reads as a halo round the number you look at
    function ring(x, y, r, mat, h) { const m = new TH.Mesh(GEO.ring, mat), [a, b] = wx(x, y); m.position.set(a, Y + (h ? h * K : .012), b); m.scale.set(r * K, 1, r * K); m.userData.r = r; m.renderOrder = 4; gd.add(m); return m; }
    // the ball's path (a line of short bars) and a mark where it ends
    function pathLine(pts, mat, w) { if (!pts || pts.length < 2) return; let px = pts[0][0], py = pts[0][1], acc = 0, on = true; for (let k = 1; k < pts.length; k++) { const [x, y] = pts[k], d = Math.hypot(x - px, y - py); if (d < .9 && k < pts.length - 1) continue; if (on) bar(px, py, x, y, w || .8, mat, .025); acc += d; on = !on || d > 2.5; px = x; py = y; } }
    function endMark(pv, mat) { if (!pv || !pv.path || pv.path.length < 2) return; const [x, y] = pv.path[pv.path.length - 1]; ring(x, y, pv.end === 'stop' ? 1.6 : 1.2, pv.end === 'goal' ? MAT.sel : pv.end === 'out' ? MAT.no : mat); }
    // the ball's marker: a little cone floating over the ball, always in view (the ball itself is small on the big table)
    const beacon = new TH.Mesh(new TH.ConeGeometry(1.15 * K, 2.2 * K, 18), new TH.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .95, toneMapped: false, depthTest: false, depthWrite: false }));
    beacon.rotation.x = Math.PI; beacon.renderOrder = 9; beacon.visible = false; board.add(beacon);
    let beaconOn = false;
    function beaconAt(on) { beaconOn = !!on && !!st && !over; beacon.visible = beaconOn; if (beaconOn) beaconPut(); kick(100); }
    function beaconPut() { if (!st) return; const [a, b] = wx(st.ball.x, st.ball.y), sc = whole ? 1.8 : 1, bob = Math.sin(performance.now() / 260) * .5; beacon.scale.setScalar(sc); beacon.position.set(a, Y + (D.RBALL * 2 + 2.6 * sc + bob) * K, b); }
    function boxArea(B) { const m = new TH.Mesh(GEO.bar, MAT.box), [a, b] = wx((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2); m.position.set(a, Y + .006, b); m.scale.set((B.x1 - B.x0 + 2 * D.KHW) * K, 1, (B.y1 - B.y0 + 2 * D.KHD) * K); m.renderOrder = 3; gd.add(m); }
    // the flick your pull makes: you point where the BALL goes (the opposite of the pull); the button's run follows from it
    const distOf = pw => 2 + pw * 150;   // the pull: how far the ball should roll (cm) — the end mark follows your hand
    function aimMove(a) { if (!a || sel < 0) return null; const c = E.ballAim(st, sel, a.ang, distOf(a.pow)); return c ? { i: sel, ang: c.ang, v: c.v, limited: c.limited } : { i: sel, ang: Math.atan2(st.ball.y - st.b[sel].y, st.ball.x - st.b[sel].x), v: vOf(a.pow), limited: true }; }
    let pv = null, pvKey = '';
    function preview(mv) { const k = mv.i + ':' + mv.ang.toFixed(4) + ':' + mv.v.toFixed(1) + ':' + st.ply; if (k !== pvKey) { pvKey = k; pv = E.ballPath(st, mv); } return pv; }
    // what a flick would do: the button's run to its first contact (dots), then the ball's path to its first knock (the line)
    function drawMove(mv, matPath, matBall) {
      const b = st.b[mv.i], tr = E.aimTrace(st, mv.i, mv.ang);
      dots(b.x, b.y, tr.gx, tr.gy, matPath, .35);
      if (tr.what === 'ball') { ring(tr.gx, tr.gy, D.RB, matPath, BMID); const p = preview(mv); if (p.path) { pathLine(p.path, matBall, .85); endMark(p, matBall); } }
      else if (tr.what != null) { const o = st.b[tr.what]; ring(o.x, o.y, D.RB + .5, MAT.no, BMID); ring(tr.gx, tr.gy, D.RB, MAT.no, BMID); }
      return tr;
    }
    function showGuides() {
      clearGuides();
      if (!st || over) return;
      if (phase === 'keeper') { boxArea(E.keeperBox(keeperSide, st.restart === 'pen')); kick(120); return; }
      if (phase !== 'aim' || !human(st.pos)) return;
      // which buttons may play: the picked one gold, the one under the pointer white, one that may not (3 in a row) red
      for (let i = st.pos * 10; i < st.pos * 10 + 10; i++) {
        const b = st.b[i];
        if (!E.canFlick(st, i)) { ring(b.x, b.y, D.RB + .5, MAT.no, BMID); continue; }
        if (i === sel) { const r = ring(b.x, b.y, D.RB + .9, MAT.sel, BMID); r.userData.pulse = 1; }
        else if (i === hov) ring(b.x, b.y, D.RB + .6, MAT.path, BMID);
      }
      if (aim && sel >= 0) {
        const mv = aimMove(aim), b = st.b[sel];
        drawMove(mv, MAT.path, MAT.ball);
        // the pull: a band from the button back toward your finger, its colour the strength
        const L0 = D.RB + 1.5 + aim.pow * 13, back = aim.ang + Math.PI;
        MAT.arrow.color.copy(new TH.Color().setHSL(.33 - aim.pow * .33, .9, .55));
        bar(b.x + Math.cos(back) * D.RB, b.y + Math.sin(back) * D.RB, b.x + Math.cos(back) * L0, b.y + Math.sin(back) * L0, 1.2, MAT.arrow, .03);
        const ex = b.x + Math.cos(back) * L0, ey = b.y + Math.sin(back) * L0; ring(ex, ey, .9, MAT.arrow);
      } else if (hintMove && hintMove.i === sel) drawMove(hintMove, MAT.hint, MAT.hint);
      kick(120);
    }
    let pulseT = 0;
    function pulse() { clearInterval(pulseT); const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || document.hidden || !document.hasFocus() || (T3.decoOn && !T3.decoOn())) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { const s = (D.RB + .9) * K * (1.06 + Math.sin((performance.now() - t0) / 230) * .08); m.scale.set(s, 1, s); any = true; } }); if (beaconOn) { beaconPut(); any = true; } if (any) kick(80); }, 60); }

    /* ---------- HUD, toasts, the call button ---------- */
    const css = document.createElement('style');
    css.textContent = `.hud .btp{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-weight:800;font-size:13px;opacity:.66;white-space:nowrap}.hud .btp.on{opacity:1;background:rgba(255,255,255,.92);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hud .btp i{width:15px;height:15px;border-radius:50%;display:inline-block;flex:none;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.3)}.hud .btp b{font-size:17px}.hud .btm{display:flex;flex-direction:column;align-items:center;min-width:0;font-weight:800;font-size:13px;line-height:1.25;max-width:44vw;text-align:center}.hud .btm small{font-size:11.5px;font-weight:800;opacity:.75;white-space:nowrap}.hud .btm span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.bttask{position:fixed;left:50%;top:calc(80px + env(safe-area-inset-top));transform:translateX(-50%);z-index:85;max-width:min(92vw,520px);padding:8px 18px;border-radius:99px;background:rgba(255,255,255,.96);color:#1d2133;font-weight:900;font-size:15px;pointer-events:none;text-align:center;white-space:nowrap;box-shadow:0 0 0 2.5px ${THEME},0 6px 18px rgba(0,0,0,.25)}.bttask[hidden]{display:none}
.bttoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,560px);padding:11px 22px;border-radius:22px;background:#fff;color:#1d2133;font-weight:900;font-size:16px;box-shadow:0 0 0 3px ${THEME},0 10px 26px rgba(0,0,0,.4);pointer-events:none;text-align:center;line-height:1.45;white-space:pre-line}.bttoast.good{color:#12684a;box-shadow:0 0 0 3px #1f7a55,0 10px 26px rgba(0,0,0,.4)}.bttoast.bad{color:#a8323a;box-shadow:0 0 0 3px #a8323a,0 10px 26px rgba(0,0,0,.4)}
.btgoal{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.6);z-index:92;pointer-events:none;font:900 clamp(54px,11vw,120px)/1 "Fredoka",system-ui,sans-serif;color:#ffd84a;letter-spacing:.04em;text-shadow:0 4px 0 #b8741a,0 10px 30px rgba(0,0,0,.45);opacity:0;transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .25s;white-space:nowrap}.btgoal.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.btpow{position:fixed;z-index:6;pointer-events:none;padding:4px 10px;border-radius:99px;background:rgba(20,22,34,.82);color:#fff;font-weight:900;font-size:14px;transform:translate(-50%,-150%);white-space:nowrap}
.btcall{position:fixed;left:50%;top:calc(128px + env(safe-area-inset-top));transform:translateX(-50%);z-index:86;display:flex;gap:10px}.btcall[hidden]{display:none}.btcall button{border:0;border-radius:99px;padding:13px 26px;font:inherit;font-size:18px;font-weight:900;cursor:pointer;background:${THEME};color:#fff;box-shadow:0 4px 0 #456f12,0 8px 20px rgba(0,0,0,.3);white-space:nowrap}.btcall button.alt{background:#fff;color:#1d2133;box-shadow:0 4px 0 #c8ccd8,0 8px 20px rgba(0,0,0,.25)}.btcall button:disabled{opacity:.45;cursor:default}
.bthow{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.55);padding:16px}.bthow-c{background:#fff;color:#1d2133;border-radius:24px;box-shadow:0 0 0 4px ${THEME},0 18px 50px rgba(0,0,0,.45);padding:22px 22px 18px;width:min(460px,100%);max-height:100%;overflow:auto}.bthow h2{margin:0 0 14px;font-size:24px;font-weight:900;text-align:center;color:${THEME}}.bthow ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}.bthow li{display:flex;align-items:center;gap:12px;font-size:17px;font-weight:800;line-height:1.35}.bthow li i{flex:none;width:40px;height:40px;border-radius:50%;background:#eef6e0;color:${THEME};display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;font-weight:900}.bthow label{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0 6px;font-size:16px;font-weight:800;cursor:pointer}.bthow label input{width:20px;height:20px;accent-color:${THEME}}.bthow .n{margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7083;text-align:center}.bthow button{display:block;width:100%;padding:13px;border:0;border-radius:99px;background:${THEME};color:#fff;font:inherit;font-size:18px;font-weight:900;cursor:pointer}
@media (min-width:900px) and (min-height:560px) and (hover:hover){.bthow-c{width:min(820px,64vw);padding:28px 34px 22px}.bthow h2{font-size:30px}.bthow li{font-size:21px}.bthow li i{width:48px;height:48px;font-size:24px}}
.btflip{position:fixed;left:calc(16px + env(safe-area-inset-left));bottom:calc(22px + env(safe-area-inset-bottom));z-index:40;width:54px;height:54px;border-radius:50%;border:0;background:rgba(255,255,255,.94);color:#2b3044;box-shadow:0 4px 14px rgba(0,0,0,.22);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.btflip svg{width:28px;height:28px}.btflip.on{background:${THEME};color:#fff}.btview{left:calc(80px + env(safe-area-inset-left))}
@media (max-width:560px){.btview{left:auto;right:calc(16px + env(safe-area-inset-right))}.hud .btp{padding:3px 7px;font-size:12px}.hud .btp .nm{display:none}.hud .btm{font-size:12px}.bttoast{font-size:14px;padding:9px 16px;border-radius:18px}.bttask{font-size:13px;padding:7px 14px;white-space:normal;border-radius:18px;line-height:1.35;width:max-content;max-width:88vw}.btcall{top:calc(118px + env(safe-area-inset-top))}.btcall button{font-size:16px;padding:11px 20px}}`;
    document.head.appendChild(css);
    const HK = 'atlas-botao-howto';
    const howtoOn = () => { try { return localStorage.getItem(HK) !== 'off'; } catch (e) { return true; } };
    let cardEl = null;
    function howtoCard(done) {
      const Hh = HOWTO[lang] || HOWTO.en, steps = Hh[mousey() ? 'm' : 't'], ic = ['☝', '↙', '🟢', '📣', '🖐'];
      const d = document.createElement('div'); d.className = 'bthow'; d.dir = lang === 'ar' ? 'rtl' : 'ltr';
      d.innerHTML = `<div class="bthow-c" role="dialog" aria-modal="true"><h2>${esc(Hh.title)}</h2><ol>${steps.map((x, i) => `<li><i>${ic[i]}</i><span>${esc(x)}</span></li>`).join('')}</ol><label><input type="checkbox"> ${esc(Hh.never)}</label><p class="n">${esc(Hh.note.replace('{r}', t('bv.rules')))}</p><button type="button">${esc(Hh.ok)}</button></div>`;
      const close = () => { if (d.querySelector('input').checked) { try { localStorage.setItem(HK, 'off'); } catch (e) {} } d.remove(); cardEl = null; done && done(); };
      d.querySelector('button').onclick = close;
      ['pointerdown', 'pointermove', 'pointerup'].forEach(k => d.addEventListener(k, e => e.stopPropagation()));
      document.body.appendChild(d); cardEl = d;
    }
    let toastEl = null, toastT = 0;
    function toast(m, kind) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'bttoast' + (kind ? ' ' + kind : ''); toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, Math.max(1800, m.length * 70)); }
    const goalEl = document.createElement('div'); goalEl.className = 'btgoal'; document.body.appendChild(goalEl);
    function bigGoal(txt) { goalEl.textContent = txt; goalEl.classList.add('on'); later(() => goalEl.classList.remove('on'), 1700); }
    const powEl = document.createElement('div'); powEl.className = 'btpow'; powEl.hidden = true; document.body.appendChild(powEl);
    const taskEl = document.createElement('div'); taskEl.className = 'bttask'; taskEl.hidden = true; document.body.appendChild(taskEl);
    const task = m => { if (stopped) return; taskEl.textContent = m || ''; taskEl.hidden = !m; };
    const callEl = document.createElement('div'); callEl.className = 'btcall'; callEl.hidden = true;
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => callEl.addEventListener(k, e => e.stopPropagation()));
    (document.getElementById('bv') || document.body).appendChild(callEl);
    function callBar(kind) {
      if (stopped) return;
      if (kind === 'shot') { callEl.innerHTML = `<button type="button">📣 ${esc(tx('shoot'))}</button>`; callEl.querySelector('button').onclick = declare; callEl.hidden = false; }
      else if (kind === 'keeper') { callEl.innerHTML = `<button type="button">🧤 ${esc(tx('ready'))}</button>`; callEl.querySelector('button').onclick = () => keeperDone(); callEl.hidden = false; }
      else { callEl.hidden = true; callEl.innerHTML = ''; }
    }
    const dotCol = p => U.dot ? U.dot(p) : (p === 0 ? '#d4352a' : '#e9e6dc');
    const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    function hud() {
      if (stopped || !st) return;
      const pill = p => `<span class="btp ${st.pos === p && !over ? 'on' : ''}"><i style="background:${dotCol(p)}"></i><span class="nm">${esc(nameOf(p))}</span><b>${st.score[p]}</b></span>`;
      const top = st.goals ? tx('to', { n: st.goals }) : tx(st.half === 1 ? 'first' : 'second') + ' ' + mmss(st.halfLen - st.clock);
      const sub = `<small>${esc(top)} · ${esc(tx('touch', { n: st.rem }))}</small>`;
      ctx.hud(pill(1) + `<span class="btm">${sub}<span>${esc(msg)}</span></span>` + pill(0));
    }
    const say = m => { msg = m || ''; hud(); };

    /* ---------- the AI ---------- */
    let worker = null, wid = 0; const pend = {};
    try { worker = new Worker('../botao/worker.js?v=2'); worker.onmessage = e => { const d = e.data || {}, f = pend[d.id]; if (f) { delete pend[d.id]; f(d.move || null); } }; worker.onerror = () => { worker = null; Object.keys(pend).forEach(k => { const f = pend[k]; delete pend[k]; f(null); }); }; } catch (e) { worker = null; }
    function ask(msgO, local) {
      return new Promise(res => {
        const run = () => setTimeout(() => res(local()), 30);
        if (!worker) return run();
        const id = ++wid; pend[id] = r => r ? res(r) : run();
        worker.postMessage(Object.assign({ id }, msgO));
        setTimeout(() => { if (pend[id]) { delete pend[id]; run(); } }, 9000);
      });
    }
    const seed = () => (Math.random() * 1e9) | 0;
    const think = (s, lv) => { const sd = seed(); return ask({ s, level: lv, seed: sd }, () => E.think(s, lv, sd)); };
    const keeperAI = (s, side, lv) => { const sd = seed(); return ask({ s, level: lv, seed: sd, keeper: side }, () => E.keeperFor(s, side, lv, sd)); };

    /* ---------- neon: the RGB keeps flowing while you play ---------- */
    let waveT = 0;
    function neonTick() {
      cancelAnimationFrame(waveT); if (stopped || !U || U.look !== 'neon') return;
      const c = new TH.Color();
      const step = () => { if (stopped) return; waveT = requestAnimationFrame(step);
        if (U.look === 'neon' && !document.hidden && document.hasFocus()) { c.setHSL((performance.now() / 2600) % 1, 1, .6); U.mats.top.emissive.setRGB(.8, .8, .8).lerp(c, .4); kick(160); } };
      waveT = requestAnimationFrame(step);
    }

    /* ---------- playing a flick back ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, t0 = performance.now();
        let ev = 0, el = 0, last = t0, gone = false;
        (function step() {
          if (stopped) return done();
          const now = performance.now(); el += Math.max(0, now - last) / 1000 * speedUp; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi], f0 = F[Math.max(0, fi - 1)];
          for (let i = 0; i < 20; i++) put(bt[i], f[i * 2], f[i * 2 + 1]);
          const bx = f[40], by = f[41];
          put(ballG, bx, by);
          const dd = Math.hypot(bx - f0[40], by - f0[41]); if (dd > 1e-4 && ballG.children[0]) { const ax = new TH.Vector3(f0[41] - by, 0, bx - f0[40]).normalize(); ballG.children[0].rotateOnWorldAxis(ax, dd / D.RBALL * -1); }
          follow(bx, by, 'slow');
          while (ev < sim.events.length && sim.events[ev].t <= el) {
            const e = sim.events[ev++];
            if ((e.k === 'hit' || e.k === 'ball') && e.v > 6) SND.hit(e.v * (e.k === 'ball' ? .55 : 1)); else if ((e.k === 'rim' || e.k === 'post' || e.k === 'keep') && e.v > 10) SND.cush(e.v * .7); else if (e.k === 'goal') { SX.net(); gone = true; }
          }
          kick(120);
          if (fi < F.length - 1) requestAnimationFrame(step); else done(gone);
        })();
      });
    }
    // after the rules: pieces glide to where the restart puts them
    function glideTo(s, ms) {
      return new Promise(done => {
        const from = { b: bt.map(g => ({ x: g.position.x / K, y: g.position.z / K })), ball: { x: ballG.position.x / K, y: ballG.position.z / K }, k: kp.map(g => ({ x: g.position.x / K, y: g.position.z / K })) };
        const far = Math.max(...s.b.map((b, i) => Math.hypot(b.x - from.b[i].x, b.y - from.b[i].y)), Math.hypot(s.ball.x - from.ball.x, s.ball.y - from.ball.y), ...s.k.map((k, i) => Math.hypot(k.x - from.k[i].x, k.y - from.k[i].y)));
        if (far < .05) return done();
        const t0 = performance.now(), Dm = ms || 650;
        (function step() {
          if (stopped) return done();
          const k = Math.min(1, (performance.now() - t0) / Dm), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, hop = Math.sin(k * Math.PI);
          s.b.forEach((b, i) => { const a = from.b[i], d = Math.hypot(b.x - a.x, b.y - a.y); put(bt[i], a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, d > 1 ? hop * Math.min(.12, d * .004) : 0); });
          put(ballG, from.ball.x + (s.ball.x - from.ball.x) * e, from.ball.y + (s.ball.y - from.ball.y) * e, Math.hypot(s.ball.x - from.ball.x, s.ball.y - from.ball.y) > 1 ? hop * .1 : 0);
          s.k.forEach((q, i) => { const a = from.k[i]; put(kp[i], a.x + (q.x - a.x) * e, a.y + (q.y - a.y) * e); });
          kick(120);
          if (k < 1) requestAnimationFrame(step); else done();
        })();
      });
    }
    function keeperSlide(side, to, ms) {
      return new Promise(done => {
        const g = kp[side], fx = g.position.x / K, fy = g.position.z / K, t0 = performance.now();
        (function step() { if (stopped) return done(); const k = Math.min(1, (performance.now() - t0) / (ms || 420)), e = 1 - Math.pow(1 - k, 3); put(g, fx + (to.x - fx) * e, fy + (to.y - fy) * e); kick(100); if (k < 1) requestAnimationFrame(step); else done(); })();
      });
    }

    /* ---------- the flow ---------- */
    const vOf = pw => E.VMIN + (E.VMAX - E.VMIN) * pw * pw, powOf = v => Math.sqrt(Math.max(0, Math.min(1, (v - E.VMIN) / (E.VMAX - E.VMIN))));
    const RESTART = { kick: 'kick', fk: 'fk', ifk: 'ifk', throw: 'throw', corner: 'corner', gk: 'gk', pen: 'pen', keeper: 'keeperball' };
    async function flick(move) {
      if (over || stopped || busy) return;
      busy = true; phase = 'anim'; clearGuides(); aim = null; hintMove = null; powEl.hidden = true; callBar(null); task(''); beaconAt(false); drag = null; pan = { x: 0, y: 0 };
      const s0 = st, p = s0.pos;
      SND.flick();
      const sim = E.simulate(s0, move, { frames: true });
      speedUp = 1; say('');
      const gone = await playback(sim); if (stopped) return;
      const r = E.resolve(s0, sim);
      ply++;
      const lead = r.msg[0];
      if (r.goal >= 0) {
        SX.goal(); bigGoal(tx(lead === 'own' ? 'own' : 'goal'));
        st = r.s; hud();
        toast(tx('scored', { p: nameOf(r.goal), a: st.score[0], b: st.score[1] }), r.goal === 0 || pvp ? 'good' : 'bad');
        await new Promise(res => later(res, 1900)); if (stopped) return;
        if (st.over) { busy = false; return end(); }
        await glideTo(st, 900); if (stopped) return;
        busy = false; follow(st.ball.x, st.ball.y, false); syncAll(); later(next, 500); void gone; return;
      }
      st = r.s;
      if (r.foul) { SX.whistle(2, .2); toast(tx(r.msg.includes('pen') ? 'penFoul' : 'foul') + '\n' + tx(RESTART[st.restart] || 'fk'), 'bad'); }
      else if (lead === 'nogoal') { SX.whistle(1); toast(tx('nogoal'), 'bad'); }
      else if (lead === 'save') { SX.ooh(); toast(tx('save'), p === 0 && !pvp ? 'bad' : 'good'); }
      else if (lead === 'miss') { SX.ooh(); toast(tx('miss')); }
      else if (['throw', 'corner', 'gk'].includes(lead)) { SX.whistle(1, .22); toast(tx(lead)); }
      else if (lead === 'touches') { SX.whistle(1, .22); toast(tx('touchesOut'), 'bad'); }
      else if (lead === 'furada' || lead === 'ownfirst' || lead === 'lost' || lead === 'keeperball') toast(tx(lead), human(p) && !pvp ? 'bad' : '');
      else if (lead === 'three') toast(tx('three'), 'bad');
      await glideTo(st, 600); if (stopped) return;
      syncAll(); busy = false;
      if (st.over) return end();
      if (clockOut()) return;
      later(next, r.change ? 650 : 250);
    }
    function onTurn() { if (ctx.onTurn) ctx.onTurn(st.pos === 0 ? 0 : 1, { human: human(st.pos), ply }); }
    // what the side with the ball should do now
    function taskLine() {
      if (st.shot) return tx('shootNow');
      if (st.restart && RESTART[st.restart] && st.rem === 12) return tx(RESTART[st.restart]) + ' — ' + tx('pick');
      if (E.canShoot(st)) return tx('canShoot');
      return tx('pick');
    }
    function autoSel() {
      let best = -1, bd = 1e9;
      for (let i = st.pos * 10; i < st.pos * 10 + 10; i++) { if (!E.canFlick(st, i)) continue; const d = Math.hypot(st.b[i].x - st.ball.x, st.b[i].y - st.ball.y); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    async function next() {
      if (over || stopped) return;
      hintMove = null; aim = null; clearGuides(); onTurn(); hud(); beaconAt(true);
      const p = st.pos;
      if (pvp) viewTo();
      follow(st.ball.x, st.ball.y, true);
      if (human(p)) {
        if (!pvp && !st.shot) hist.push({ st: E.clone(st), ply });
        sel = autoSel(); phase = 'aim'; frameBallAnd(sel, true);
        say(pvp ? tx('turn', { p: nameOf(p) }) : t('p.turn')); task(taskLine());
        callBar(E.canShoot(st) ? 'shot' : null);
        if (!told && howtoOn()) howtoCard(() => {}); told = true;
        showGuides(); pulse();
        return;
      }
      phase = 'ai'; callBar(null); say(tx(matchMedia('(max-width:560px)').matches ? 'turn' : 'think', { p: nameOf(p) })); task('');
      const my = tok;
      const mv = await think(E.clone(st), level);
      if (stopped || my !== tok) return;
      if (mv && mv.declare) { await aiDeclare(); return; }
      await aiFlick(mv, my);
    }
    async function aiFlick(mv, my) {
      if (!mv || mv.i == null) { mv = { i: autoSel(), ang: -Math.PI / 2, v: 60 }; }
      // show which button and where it means to send the ball for a moment, then flick (its hand may still wobble)
      clearGuides(); pan = { x: 0, y: 0 }; frameBallAnd(mv.i, true); const b = st.b[mv.i]; ring(b.x, b.y, D.RB + .9, MAT.sel, BMID); drawMove(mv, MAT.path, MAT.aiBall); kick(150);
      await new Promise(r => later(r, 900)); if (stopped || my !== tok) return;
      flick(E.perform(mv, level, seed()));
    }
    // a shot is called: the defender sets the keeper, then the attacker shoots
    let keeperSide = -1, keeperT = 0;
    async function declare() {
      if (stopped || over || busy || phase !== 'aim' || !E.canShoot(st)) return;
      callBar(null); aim = null; hintMove = null; clearGuides();
      SX.whistle(1, .16); toast(tx('called', { p: nameOf(st.pos) }));
      st = E.clone(st); st.shot = true;
      await setKeeperPhase();
    }
    async function aiDeclare() {
      SX.whistle(1, .16); toast(tx('called', { p: nameOf(st.pos) }));
      st = E.clone(st); st.shot = true;
      await setKeeperPhase();
    }
    async function setKeeperPhase() {
      const d = 1 - st.pos, my = tok; keeperSide = d;
      if (human(d)) {
        phase = 'keeper'; say(tx('keeper')); task(tx('keeperTask')); callBar('keeper'); showGuides();
        // the ball, the shooter and your goal in one view
        { const gy = E.goalY(d); camAt = { x: st.ball.x / 2, y: (st.ball.y + gy) / 2 }; span = { x: Math.abs(st.ball.x) + 14, y: Math.abs(gy - st.ball.y) + 4 }; pan = { x: 0, y: 0 }; camFit(true); }
        let left = 10; clearInterval(keeperT);
        keeperT = setInterval(() => { if (stopped || phase !== 'keeper') return clearInterval(keeperT); if (document.hidden || !document.hasFocus()) return; left--; task(tx('keeperTask') + ' (' + left + ')'); if (left <= 0) { clearInterval(keeperT); keeperDone(); } }, 1000);
        return;
      }
      phase = 'ai'; say(tx('aiKeeper', { p: nameOf(d) }));
      const k = await keeperAI(E.clone(st), d, level); if (stopped || my !== tok) return;
      E.setKeeper(st, d, k.x, k.y); await keeperSlide(d, st.k[d]); if (stopped || my !== tok) return;
      afterKeeper();
    }
    function keeperDone() {
      if (stopped || phase !== 'keeper') return;
      clearInterval(keeperT); callBar(null); clearGuides(); afterKeeper();
    }
    async function afterKeeper() {
      const p = st.pos, my = tok;
      if (human(p)) { if (pvp) viewTo(); phase = 'aim'; sel = autoSel(); say(pvp ? tx('turn', { p: nameOf(p) }) : t('p.turn')); task(tx('shootNow')); frameBallAnd(sel, true); showGuides(); pulse(); return; }
      phase = 'ai'; say(tx(matchMedia('(max-width:560px)').matches ? 'turn' : 'think', { p: nameOf(p) })); task('');
      const mv = await think(E.clone(st), level); if (stopped || my !== tok) return;
      await aiFlick(mv && !mv.declare ? mv : null, my);
    }

    /* ---------- the match clock (timed halves): runs on performance.now (it stands still while the window is not in front) ---------- */
    let clk0 = 0, clkT = 0;
    function clockTick() {
      clearInterval(clkT); if (st.goals) return;
      clk0 = performance.now();
      clkT = setInterval(() => {
        if (stopped || over || !st || cardEl) { clk0 = performance.now(); return; }
        const now = performance.now(), dt = (now - clk0) / 1000; clk0 = now;
        if (phase === 'wait') return;
        st.clock = Math.min(st.halfLen, st.clock + dt); hud();
        if (st.clock >= st.halfLen && !busy && (phase === 'aim' || phase === 'keeper') && !st.shot) clockOut();
      }, 250);
    }
    function clockOut() {
      if (st.goals || st.clock < st.halfLen || over) return false;
      tok++; clearGuides(); callBar(null); clearInterval(keeperT); phase = 'anim';
      const r = E.timeUp(st); st = r.s;
      if (st.over) { SX.whistle(3, .32); return end(), true; }
      SX.whistle(2, .3); toast(tx('half'), 'good'); hist.length = 0;
      later(async () => { await glideTo(st, 900); syncAll(); st.clock = 0; hud(); next(); }, 1600);
      return true;
    }
    function end() {
      over = true; phase = 'over'; clearGuides(); callBar(null); task(''); clearInterval(clkT); beaconAt(false); if (ctx.onTurn) ctx.onTurn(-1); flipBtn.hidden = viewBtn.hidden = true; if (pvp) viewTo(0);
      SX.whistle(3, .3); hud();
      const score = tx('score', { a: st.score[0], b: st.score[1] }), w = st.winner;
      if (pvp) { say(w < 0 ? t('res.draw') : tx('wins', { p: nameOf(w) })); return later(() => ctx.onEnd({ win: false, draw: w < 0, level, score, pvp: true, winnerText: (w < 0 ? t('res.draw') : tx('wins', { p: nameOf(w) })) + ' · ' + score }), 1400); }
      say(w === 0 ? t('res.win') : w < 0 ? t('res.draw') : t('res.lose'));
      later(() => ctx.onEnd({ win: w === 0, draw: w < 0, level, score }), 1400);
    }

    /* ---------- your hand: pick a button, pull back from it, let go ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .02); return q ? { x: q.x / K, y: q.z / K } : null; };
    const scr = (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); };
    const canAim = () => !cardEl && !stopped && !over && !busy && phase === 'aim' && !!st && human(st.pos);
    function btnAt(q, slack) {
      let best = -1, bd = 1e9;
      for (let i = st.pos * 10; i < st.pos * 10 + 10; i++) { const d = Math.hypot(st.b[i].x - q.x, st.b[i].y - q.y); if (d < D.RB + slack && d < bd) { bd = d; best = i; } }
      return best;
    }
    let drag = null, kdrag = false;
    const DEAD = 14;
    const PULL = () => Math.max(110, Math.min(230, Math.min(innerWidth, innerHeight) * .3));
    function aimFrom(e) {
      // the pull in screen pixels (the same feel at any zoom); its direction on the table from two picked points
      const p0 = drag.anchor, dx = p0.x - e.clientX, dy = p0.y - e.clientY, len = Math.hypot(dx, dy);
      if (len < DEAD) return null;
      const a = toCm({ clientX: e.clientX, clientY: e.clientY }), b = toCm({ clientX: p0.x, clientY: p0.y });
      if (!a || !b) return null;
      return { ang: Math.atan2(b.y - a.y, b.x - a.x), pow: Math.max(0, Math.min(1, (len - DEAD) / PULL())) };
    }
    // a press: on one of your buttons (or close to the picked one) → pull to aim; anywhere else → drag the view.
    // The right / middle mouse button always drags the view. A second finger (a pinch to zoom) lets go of both.
    const ptrs = new Set();
    const nearSel = (e, q) => { if (sel < 0) return false; const b = st.b[sel], p = scr(b.x, b.y); return Math.hypot(q.x - b.x, q.y - b.y) < D.RB + 3 || (p && Math.hypot(p.x - e.clientX, p.y - e.clientY) < 46); };
    function pd(e) {
      ptrs.add(e.pointerId);
      if (ptrs.size > 1) { if (drag) cancel(); return; }
      if (phase === 'anim' && !stopped) { speedUp = 3; return; }
      if (phase === 'keeper' && !stopped && st && human(keeperSide)) { const q = toCm(e); if (!q) return; kdrag = true; moveKeeper(q); try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); return; }
      if (stopped || !st || cardEl) return;
      const q = toCm(e);
      const panStart = () => { drag = { id: e.pointerId, kind: 'pan', last: { clientX: e.clientX, clientY: e.clientY } }; try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {} document.documentElement.classList.add('hand-drag'); e.preventDefault(); };
      if (e.pointerType === 'mouse' && e.button !== 0) { panStart(); return; }
      if (!canAim() || !q) { if (phase !== 'anim') panStart(); return; }
      const i = btnAt(q, e.pointerType === 'mouse' ? 1 : 3.2);
      if (i >= 0) {
        if (!E.canFlick(st, i)) { toast(tx('limit3'), 'bad'); return; }
        sel = i; hintMove = null;
      } else if (!nearSel(e, q)) { panStart(); return; }
      const p = scr(st.b[sel].x, st.b[sel].y); drag = { id: e.pointerId, kind: 'aim', anchor: p };
      try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      document.documentElement.classList.add('hand-drag');
      showGuides(); e.preventDefault();
    }
    function pm(e) {
      if (kdrag) { const q = toCm(e); if (q) moveKeeper(q); return; }
      if (!drag) {
        if (e.pointerType === 'mouse' && canAim()) { const q = toCm(e); const h = q ? btnAt(q, 1) : -1; if (h !== hov) { hov = h; showGuides(); } ctx.el.style.cursor = h >= 0 || (q && nearSel(e, q)) ? 'grab' : 'move'; }
        return;
      }
      if (e.pointerId !== drag.id) return;
      if (drag.kind === 'pan') { const a = toCm(drag.last), b = toCm(e); if (a && b) panBy(a.x - b.x, a.y - b.y); drag.last = { clientX: e.clientX, clientY: e.clientY }; return; }
      if (!canAim()) return cancel();
      aim = aimFrom(e);
      if (aim) { powEl.hidden = false; powEl.textContent = Math.round(aim.pow * 100) + '%'; powEl.style.left = e.clientX + 'px'; powEl.style.top = e.clientY + 'px'; say('💪 ' + Math.round(aim.pow * 100) + '%'); }
      else { powEl.hidden = true; say(t('p.turn')); }
      showGuides();
    }
    function pu(e) {
      ptrs.delete(e.pointerId);
      if (kdrag) { kdrag = false; try { ctx.el.releasePointerCapture(e.pointerId); } catch (er) {} return; }
      if (!drag || e.pointerId !== drag.id) return;
      try { ctx.el.releasePointerCapture(drag.id); } catch (er) {}
      document.documentElement.classList.remove('hand-drag');
      if (drag.kind === 'pan') { drag = null; return; }
      const a = aim; drag = null; aim = null; powEl.hidden = true;
      if (a && a.pow >= .04 && canAim()) { const mv = aimMove(a); flick(E.wobble({ i: mv.i, ang: mv.ang, v: mv.v }, seed(), feel)); return; }
      say(pvp ? tx('turn', { p: nameOf(st.pos) }) : t('p.turn')); showGuides();
    }
    function cancel() { drag = null; aim = null; kdrag = false; powEl.hidden = true; document.documentElement.classList.remove('hand-drag'); showGuides(); }
    function moveKeeper(q) { const d = keeperSide; if (d < 0) return; E.setKeeper(st, d, q.x, q.y); put(kp[d], st.k[d].x, st.k[d].y); kick(100); }
    const wm = e => { if ((drag && e.pointerId === drag.id) || kdrag) { if (e.target !== ctx.el && !ctx.el.contains(e.target)) pm(e); } };
    const wu = e => { if ((drag && e.pointerId === drag.id) || kdrag) pu(e); else ptrs.delete(e.pointerId); };
    ctx.el.addEventListener('pointerdown', pd); ctx.el.addEventListener('pointermove', pm); ctx.el.addEventListener('pointerup', pu); ctx.el.addEventListener('pointercancel', pu);
    addEventListener('pointermove', wm, true); addEventListener('pointerup', wu, true); addEventListener('pointercancel', wu, true);
    // no loupe / double-tap zoom / text selection while playing (as the carrom hand)
    const HTML = document.documentElement; HTML.classList.add('hand-on');
    const isUI = x => x && x.closest && x.closest('button,a,input,textarea,select,label,[role=button]');
    const nz = e => { if (!isUI(e.target)) e.preventDefault(); };
    const ts = e => { if (e.touches.length === 1 && (ctx.el.contains(e.target) || (e.target.closest && e.target.closest('#gl')))) e.preventDefault(); };
    const NZ = [['dblclick', nz], ['selectstart', nz], ['contextmenu', nz], ['touchstart', ts]];
    NZ.forEach(([k, f]) => document.addEventListener(k, f, { capture: true, passive: false }));
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';
    const onKey = e => {
      if (stopped || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) { if (phase === 'aim' && E.canShoot(st) && human(st.pos)) { e.preventDefault(); declare(); } return; }
      if (e.key === 'Enter' && phase === 'keeper') { e.preventDefault(); keeperDone(); return; }
      // the arrow keys move the view (as the screen shows it), C: back to the ball
      const pk = { ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] }[e.key];
      if (pk && !e.ctrlKey && !e.metaKey && !e.altKey && st) {
        e.preventDefault(); const cx = innerWidth / 2, cy = innerHeight / 2, st0 = Math.min(innerWidth, innerHeight) * .12;
        const a = toCm({ clientX: cx, clientY: cy }), b = toCm({ clientX: cx + pk[0] * st0, clientY: cy + pk[1] * st0 }); if (a && b) panBy(b.x - a.x, b.y - a.y); return;
      }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) { panReset(true); return; }
      if (e.key === 'Tab' && canAim() && !drag) {   // cycle the buttons that may play, nearest the ball first
        e.preventDefault();
        const L2 = []; for (let i = st.pos * 10; i < st.pos * 10 + 10; i++) if (E.canFlick(st, i)) L2.push(i);
        L2.sort((a, b) => Math.hypot(st.b[a].x - st.ball.x, st.b[a].y - st.ball.y) - Math.hypot(st.b[b].x - st.ball.x, st.b[b].y - st.ball.y));
        const k = L2.indexOf(sel), d = e.shiftKey ? -1 : 1; sel = L2[((k + d) % L2.length + L2.length) % L2.length]; hintMove = null; frameBallAnd(sel, true); showGuides();
      }
    };
    document.addEventListener('keydown', onKey);

    /* ---------- 盤面反転 and the view switch ---------- */
    const FK = 'atlas-flip-botao';
    let flipped = false; try { flipped = localStorage.getItem(FK) === '1'; } catch (e) {}
    let viewA = 0, viewRaf = 0;
    function viewTo(base, now) {
      if (base == null) base = pvp && st && st.pos === 1 && !over ? Math.PI : 0;
      let to = base + (flipped ? Math.PI : 0); to = ((to % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (!T3.turn) return;
      cancelAnimationFrame(viewRaf);
      let from = viewA; if (to - from > Math.PI + 1e-6) from += 2 * Math.PI; else if (from - to > Math.PI + 1e-6) from -= 2 * Math.PI;
      const Dm = now || Math.abs(to - from) < 1e-3 ? 0 : 750, t0 = performance.now(), ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const set = (a, sc) => { viewA = a; const m = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (Math.abs(m) < 1e-4 && sc === 1) T3.turn(null); else T3.turn(a, sc); };
      if (!Dm) { set(to, 1); return; }
      const step = () => { if (stopped) return; const k = Math.min(1, (performance.now() - t0) / Dm), e = ease(k); set(from + (to - from) * e, 1 - .12 * Math.sin(Math.PI * e)); if (k < 1) viewRaf = requestAnimationFrame(step); else set(to, 1); };
      viewRaf = requestAnimationFrame(step);
    }
    const FLIPT = { ja: '盤面を反転', en: 'Flip the board', zh: '翻转棋盘', ko: '판 뒤집기', es: 'Girar el tablero', fr: 'Retourner le plateau', pt: 'Girar o tabuleiro', de: 'Brett drehen', hi: 'बोर्ड पलटें', ar: 'قلب اللوحة', ru: 'Перевернуть доску', 'zh-TW': '翻轉棋盤', id: 'Balik papan', tr: 'Tahtayı çevir' };
    const layer = document.getElementById('bv') || document.body;
    const flipBtn = document.createElement('button'); flipBtn.type = 'button'; flipBtn.className = 'btflip';
    flipBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0 1 14.3-3.3"/><path d="M18.6 2.6v3.3h-3.3"/><path d="M20 15a8 8 0 0 1-14.3 3.3"/><path d="M5.4 21.4v-3.3h3.3"/><circle cx="12" cy="12" r="3"/></svg>';
    flipBtn.title = FLIPT[lang] || FLIPT.en; flipBtn.setAttribute('aria-label', flipBtn.title);
    const flipSync = () => { flipBtn.classList.toggle('on', flipped); flipBtn.setAttribute('aria-pressed', flipped ? 'true' : 'false'); };
    function flip() { if (stopped) return; flipped = !flipped; try { localStorage.setItem(FK, flipped ? '1' : '0'); } catch (e) {} flipSync(); cancel(); viewTo(); }
    flipBtn.addEventListener('click', e => { e.preventDefault(); flip(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => flipBtn.addEventListener(k, e => e.stopPropagation()));
    flipSync(); layer.appendChild(flipBtn);
    viewTo(0, true);
    const viewBtn = document.createElement('button'); viewBtn.type = 'button'; viewBtn.className = 'btflip btview';
    const ICO_WHOLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="1.5"/><path d="M5 12h14"/><circle cx="12" cy="12" r="2.6"/></svg>';
    const ICO_NEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/></svg>';
    const viewSync = () => { const lab = tx(whole ? 'viewNear' : 'viewWhole'); viewBtn.innerHTML = whole ? ICO_NEAR : ICO_WHOLE; viewBtn.title = lab; viewBtn.setAttribute('aria-label', lab); };
    function toggleView() { if (stopped) return; whole = !whole; pan = { x: 0, y: 0 }; try { localStorage.setItem(VK, whole ? 'whole' : 'near'); } catch (e) {} viewSync(); cancel(); camFit(false); kick(800); }
    viewBtn.addEventListener('click', e => { e.preventDefault(); toggleView(); });
    ['pointerdown', 'pointermove', 'pointerup'].forEach(k => viewBtn.addEventListener(k, e => e.stopPropagation()));
    viewSync(); layer.appendChild(viewBtn);
    const onFlipKey = e => { if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) flip(); else if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) toggleView(); };
    document.addEventListener('keydown', onFlipKey);

    /* ---------- go ---------- */
    build();
    const goNow = () => {
      st = E.newMatch({ first: youFirst ? 0 : 1, goals: size === 103 ? 3 : 0, half: size === 103 ? 300 : size * 60 });
      syncAll(); hud(); follow(0, 0, false); clockTick(); pulse();
      SX.whistle(1, .5); toast(tx('kick'));
      later(next, 900);
    };
    camFit(false); neonTick();
    const pick = () => { if (stopped) return; AC().BoardPick({ lang, list: BDL, cur: look, feel: CFEEL, name: k => T3.boardName ? T3.boardName(k, lang, 'botao') : k, thumb: k => T3.boardThumb ? T3.boardThumb('botao', k) : '', pick: k => new URL('img/pick/botao-' + k + '.webp?v=2', location.href).href, color: THEME, onPick: setLook, onStart: v => { setLook(v); goNow(); }, onBack: () => { const q = document.getElementById('bvQuit'); if (q) q.click(); } }); };
    if (howtoOn()) { told = true; howtoCard(pick); } else { told = true; pick(); }

    const myTurn = () => !stopped && !over && !busy && st && human(st.pos) && phase === 'aim';
    function finish(why) {
      if (over || !st) return;
      tok++; over = true; phase = 'over'; busy = false; clearGuides(); callBar(null); task(''); clearInterval(clkT); if (ctx.onTurn) ctx.onTurn(-1); flipBtn.hidden = viewBtn.hidden = true; if (pvp) viewTo(0);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      say(t('res.lose')); setTimeout(() => { if (!stopped) ctx.onEnd(pvp ? { win: false, draw: false, level, score: r, pvp: true, winnerText: r } : { win: false, draw: false, level, score: r }); }, 200);
    }
    const api = {
      human: 0,
      canUndo: () => !pvp && myTurn() && hist.length > 1 && !st.shot,
      undo() {
        if (!api.canUndo()) return;
        tok++; hist.pop(); const h = hist.pop(); const keepClock = st.clock, keepHalf = st.half; st = E.clone(h.st); if (st.half === keepHalf) st.clock = keepClock; ply = h.ply; busy = false; drag = null;
        syncAll(); next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const my = tok; say('💡…');
        return think(E.clone(st), 20).then(mv => {
          if (stopped || my !== tok || phase !== 'aim') return false;
          if (mv && mv.declare) { toast(tx('hintShot')); task(tx('canShoot')); say(t('p.turn')); return true; }
          if (mv && mv.i != null) { hintMove = mv; sel = mv.i; toast(tx('hint', { n: (mv.i % 10) + 2, p: Math.round(powOf(mv.v) * 100) })); }
          say(t('p.turn')); showGuides(); return true;
        });
      },
      canResign: () => !stopped && !over && !!st,
      resign() { finish('resign'); },
      timeout() { finish('time'); },
      stop() {
        document.querySelectorAll('.bpk').forEach(e => e.remove());
        stopped = true; tok++; timers.forEach(clearTimeout); board.remove(beacon); beacon.geometry.dispose(); beacon.material.dispose(); clearInterval(pulseT); clearInterval(clkT); clearInterval(keeperT);
        ctx.el.removeEventListener('pointerdown', pd); ctx.el.removeEventListener('pointermove', pm); ctx.el.removeEventListener('pointerup', pu); ctx.el.removeEventListener('pointercancel', pu);
        removeEventListener('pointermove', wm, true); removeEventListener('pointerup', wu, true); removeEventListener('pointercancel', wu, true);
        NZ.forEach(([k, f]) => document.removeEventListener(k, f, { capture: true })); HTML.classList.remove('hand-on'); HTML.classList.remove('hand-drag');
        document.removeEventListener('keydown', onKey); document.removeEventListener('keydown', onFlipKey); removeEventListener('resize', onResize); ctx.el.style.touchAction = prevTouch;
        css.remove(); powEl.remove(); taskEl.remove(); goalEl.remove(); callEl.remove(); if (toastEl) toastEl.remove(); if (cardEl) cardEl.remove(); if (worker) worker.terminate();
        cancelAnimationFrame(viewRaf); cancelAnimationFrame(waveT); flipBtn.remove(); viewBtn.remove(); if (T3.turn) T3.turn(null);
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
      },
      _debug: { st: () => st, phase: () => phase, set: s => { st = s; syncAll(); hud(); }, flick: (i, ang, pw) => { if (phase !== 'aim') return false; sel = i; flick({ i, ang, v: vOf(pw) }); return true; }, flickRaw: m => { if (phase !== 'aim') return false; flick(m); return true; }, declare: () => declare(), keeperDone: () => keeperDone(), aiDeclare: () => aiDeclare(), at: (x, y) => scr(x, y), next: () => next() },
    };
    window.__botaoTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.botao = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 5, sizeLabel, sizeName, levelInfo, start, TXT, SX, L14 };
})();
