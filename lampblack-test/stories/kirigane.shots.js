/* 狼影灯 — 霧鐘村の序幕の絵コンテ（演出 試験版）
   ページ（sid）ごとに、地の文（n）・せりふ（line）・話し手がいないときの文（alt）・顔見せ（cast）のショットを書く。
   sid：p0〜p10 は序幕の共通ページ（hero.js が付ける番号）、h:<主人公> は主人公ごとの入り、role は役の告知。 */
(function (root) {
  const T = root.WLTheater, K = root.WLTheaterKit; if (!T || !K) return;
  const { W, H, E, clamp, lerp, seg, glide, noise1, flick, breath, World, makeSnow } = T;
  const { headY, aim, L } = K;
  const who = (c, list) => list.find(id => c.people.includes(id));
  // a dark snowy ridge close to the lens (the pass the traveller stands on)
  const RIDGE = { x: 700, y: 1060, w: 1900, h: 700, blur: 7, html: `<svg viewBox="0 0 1500 700" width="100%" height="100%" preserveAspectRatio="none"><path fill="currentColor" d="M0 160 C 220 120 380 60 560 110 C 760 170 900 260 1100 330 C 1260 390 1400 420 1500 470 L1500 700 L0 700 Z"/><path fill="none" stroke="currentColor" stroke-width="10" d="M300 120 l-40 -150 m20 70 l-60 -40 m50 0 l40 -70 M420 90 l20 -110 m-10 40 l40 -30"/></svg>` };

  const P = {};
  // 峠道の最後の曲がり角で、谷の底に鐘楼が見えた
  P.p0 = {
    n: K.est({ tr: 'dip', trDur: 1.8, loc: 'tower', gy: 1300, from: [700, 300, 1.08], to: [1480, 560, .92], tau: 6, ease: 2, light: 'cold', lamp: { lx: .62, ly: .2, dark: .3 }, fx: 1250, fy: 420 }),
  };
  // 白樺亭の扉を開けると、暖炉の匂い……
  P.p1 = {
    n: K.est({ tr: 'dip', trDur: 1.2, loc: 'inn', gy: 1150, blurBg: 9, snow: { n: 60, a: .5 }, from: [1150, 760, 1.0], to: [1220, 700, 1.2], tau: 7, light: 'warm', fx: 980, fy: 420,
      draw(S, t, c) {
        // the door opens: the warm light floods out over the snow
        const o = E.o3(seg(t, .3, 2.6)), fl = flick(t, 4);
        S.w.light({ lx: .5, ly: .48, lamp: (.25 + .75 * o) * (.92 + .08 * fl), ls: .5 + .6 * o, dark: lerp(.55, .5, o), r: lerp(40, 70, o) });
        S.w.bloom({ x: .5, y: .5, r: 600 + 900 * o, a: .55 * o });
        return { snow: S.sn.map(x => Object.assign(x, { o: Object.assign(x.o, { a: 1 - o * .8 }) })) };
      } }),
    line: c => K.mcu({ loc: 'inn/in', side: { elsa: 'R', moritz: 'L', hugo: 'R' }[c.shot.who] || 'R', low: c.shot.who === 'hugo', others: ['elsa', 'moritz', 'hugo'].filter(x => x !== c.shot.who && c.people.includes(x)).slice(0, 1) }),
    alt: K.insert({ loc: 'inn/in', items: [{ svg: K.PROP.pot, x: 1000, y: 820, w: 520, h: 450 }, { svg: K.PROP.key, x: 560, y: 1080, w: 420, h: 170, blur: 6, layer: 'fg' }],
      from: [1260, 900, 1.12], to: [1230, 880, 1.24], fx: 1000, fy: 380,
      build(S) { S.st = K.puffs(S.w, 'fx', 5, 4); }, draw(S, t) { K.drawPuffs(S.st, t, 1260, 820, { per: 3.6, size: 160, rise: 420, a: .7 }); } }),
  };
  // あなたは旅の写本師だ（インク壺と羽根ペン、冷たい鍵）
  P['h:copyist'] = {
    n: K.insert({ loc: 'inn/in', items: [{ svg: K.PROP.quill, x: 980, y: 560, w: 640, h: 640 }, { svg: K.PROP.key, x: 380, y: 1010, w: 600, h: 240, blur: 9, layer: 'fg', rot: -12 }],
      from: [1180, 860, 1.05], to: [1290, 820, 1.2], tau: 9, lamp: { lx: .62, ly: .3 }, fx: 1100, fy: 380 }),
  };
  // 礼拝堂の祭壇の裏には、三百年分の教区記録が眠っている
  P.p3 = {
    n: K.est({ loc: 'tower', gy: 1240, from: [1560, 1000, 1.25], to: [1640, 420, 1.12], tau: 7, ease: 1.6, light: 'cold', lamp: { lx: .55, ly: .15, dark: .42 }, fx: 1100, fy: 360, roll: [-.8, 0] }),
    line: c => K.mcu({ loc: 'tower/in', side: c.shot.who === 'anselm' ? 'L' : 'R', low: c.shot.who === 'gerhard', dark: .7, blurBg: 15 }),
    alt: K.insert({ loc: 'tower/in', items: [{ svg: K.PROP.quill, x: 1020, y: 600, w: 560, h: 560, blur: 1 }], from: [1250, 880, 1.1], to: [1250, 860, 1.2], cold: true, lamp: { lx: .5, ly: .25, dark: .5 } }),
  };
  // その晩、宿の食堂は旅人と村の者でいっぱいになった
  P.p4 = {
    n: K.crowd({ loc: 'inn/in', dir: 1, ids: c => c.people.filter(x => x !== 'tilo').slice(0, 6) }),
    line: c => K.mcu({ loc: 'inn/in', side: c.shot.who === 'heiden' ? 'L' : 'R', h: c.shot.who === 'tilo' ? 2600 : 2400, others: c.people.filter(x => x !== c.shot.who).slice(0, 2), warm: true }),
    alt: K.crowd({ loc: 'inn/in', dir: -1, ids: c => c.people.slice(2, 8) }),
  };
  // 酒が回るころ、誰かが鐘の話を始めた（話し声がひとつずつ止む）
  const elderOf = c => who(c, ['gerhard', 'kaja', 'hugo']);
  P.p5 = {
    n: {
      tr: 'cut',
      build(r, c) {
        const w = new World(r, Object.assign({ st: c.st }, K.place('inn/in'), { ww: 2600, wh: 1500, gy: 1000, blurBg: 16 }));
        const sp = elderOf(c), rest = c.people.filter(x => x !== sp).slice(0, 4);
        if (sp) w.puppet('s', sp, { rod: false });
        rest.forEach((k, i) => w.puppet('f' + i, k, { rod: false, layer: i < 2 ? 'fg' : 'cast' }));
        w.box.classList.add('lit');
        return { w, sp, rest, c0: K.ch(c, sp) };
      },
      draw(S, t) {
        const w = S.w, k = glide(t, 10, 1.5), quiet = E.s(seg(t, .5, 7));
        // the listeners close to the lens, dark; the teller in the middle, in the firelight
        S.rest.forEach((id, i) => w.place('f' + i, i < 2 ? { x: i ? 2050 : 520, y: 3600, h: 3600, blur: 22, op: .96, face: i ? -1 : 1, still: true } : { x: i === 2 ? 900 : 1750, y: 1120, h: 1250, blur: 7, op: .8, face: i === 2 ? 1 : -1 }, t));
        if (S.sp) w.place('s', { x: 1300, y: 1000 + 1700 * .6, h: 1700, blur: .4, face: -1, still: true }, t);
        const hy = S.sp ? w.head('s', 1000 + 1700 * .6, 1700) : 700;
        aim(w, 1300, hy, W / 2, 360, lerp(1, 1.16, k));
        // the room goes quiet: the light pulls in around the teller
        L.warm(w, t, { lx: .5, ly: .34, seed: 41, dark: lerp(.6, .82, quiet), r: lerp(70, 50, quiet), ba: .45 });
        return { fx: W / 2, fy: 420 };
      },
    },
    line: c => K.ecu({ loc: 'inn/in', side: c.shot.who === 'kaja' ? 'L' : 'R', dark: .78, lampSide: 'back' }),
    alt: K.crowd({ loc: 'inn/in', dir: 1, dark: .78, tau: 14, ids: c => c.people.slice(0, 6) }),
  };
  // 翌朝、峠のほうで雷のような音がした……雪崩だった
  P.p6 = {
    n: K.est({ tr: 'dip', trDur: 1.4, loc: 'tower', gy: 1300, from: [820, 400, 1.04], to: [760, 360, 1.1], tau: 9, light: 'cold', lamp: { lx: .4, ly: .15, dark: .35 }, fx: 800, fy: 360, snow: { n: 90, wind: 60 },
      build(S) {
        // the slide: a billowing white mass that pours down from the peaks on the left (one cut-paper cloud and a few loose puffs at its front)
        let d = '<rect x="0" y="300" width="1200" height="220"/>'; for (let i = 0; i < 16; i++) { const r = 80 + ((i * 53) % 70); d += `<circle cx="${i * 80}" cy="${300 - ((i * 37) % 90)}" r="${r}"/><circle cx="${i * 80 + 40}" cy="${380}" r="${r * .9}"/>`; }
        S.cloud = S.w.add('far', 'abs', `<svg viewBox="0 0 1200 520" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible"><g fill="#fffcf6" opacity=".95">${d}</g></svg>`, { width: '1500px', height: '650px', filter: 'blur(5px)', transformOrigin: '0 100%', webkitMaskImage: 'linear-gradient(to bottom,#000 62%,transparent 96%)', maskImage: 'linear-gradient(to bottom,#000 62%,transparent 96%)' });
        S.av = []; for (let i = 0; i < 0; i++) { const e = S.w.add('far', 'puff'); e.style.background = 'radial-gradient(closest-side,rgba(255,252,246,.98),rgba(255,252,246,.6) 55%,rgba(255,252,246,0))'; S.av.push({ e, k: i / 9, s: i * 3.7 }); }
      },
      draw(S, t) {
        const go = E.o2(seg(t, .3, 6.5));
        // the cloud slides down the mountainside and swells
        const cx = lerp(-500, 150, go), cy = lerp(-120, 300, go), sc = lerp(.5, .95, go);
        Object.assign(S.cloud.style, { left: cx + 'px', top: cy + 'px', transform: `scale(${sc.toFixed(3)})`, opacity: Math.min(1, go * 4).toFixed(3) });
        for (const p of S.av) {
          const q = clamp(go * 1.3 - p.k * .3, 0, 1), sz = 180 + 380 * q;
          const x = cx + 1500 * sc * (.75 + p.k * .3) + noise1(t * .4 + p.s, p.s) * 60, y = cy + 650 * sc * (.35 + p.k * .5) - q * 40;
          Object.assign(p.e.style, { width: sz + 'px', height: sz * .7 + 'px', left: (x - sz / 2) + 'px', top: (y - sz * .35) + 'px', opacity: (Math.min(1, go * 4) * .9).toFixed(3) });
        }
        // the floor shakes a little while it falls (only a few pixels: the rumble, not a jolt)
        const rum = Math.sin(t * 31) * 2.2 * (1 - seg(t, 2, 7)) * seg(t, .5, 1.2);
        S.w.layers.forEach(l => l.el.style.translate = `0 ${rum.toFixed(2)}px`);
      } }),
  };
  // その夜、鐘が鳴った（鐘は場面が出て1.5秒後に一打、録音の中でもう一打）
  P.p7 = {
    n: K.est({ tr: 'dip', trDur: 1.6, loc: 'tower', night: true, gy: 1240, from: [1850, 1050, 1.5], to: [1950, 330, 1.32], tau: 6, ease: 2.2, light: 'night', lamp: { lx: .78, ly: .1, dark: .6 }, fx: 1250, fy: 300, snow: { n: 170, speed: .5, wind: 14, min: 1.5, max: 5 },
      people: [{ id: c => who(c, ['kaja', 'jonas', 'hugo']), x: 1500, h: 430, face: -1 }],
      build(S) { S.bell = S.w.add('near', 'abs', '', { width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(closest-side,rgba(255,226,160,.95),rgba(255,200,120,.35) 50%,transparent)', mixBlendMode: 'screen' }); },
      draw(S, t) {
        const hit = tt => t > tt ? Math.exp(-(t - tt) * 1.5) : 0, ring = hit(1.6) + hit(4.75) * .9;
        // the bell window of the tower (the backdrop's tower stands at 81% of its width)
        Object.assign(S.bell.style, { left: (1944 - 100) + 'px', top: (S.w.by + S.w.bh * .12 - 100) + 'px', opacity: (.4 + ring * .9).toFixed(3), transform: `scale(${(1.1 + ring * .8).toFixed(3)})` });
        S.w.bloom({ x: .66, y: .2, r: 1500, a: .2 + ring * .14, c: 'rgba(190,210,255,.7)' });
        return { black: 0 };
      } }),
  };
  // 朝、鐘楼の石段の下で、鐘守が冷たくなっていた
  const ELDER = { body: 'coat', h: .95, hat: 'none', beard: 'full', nose: 'hook', prop: 'none' };
  P.p8 = {
    n: K.est({ tr: 'dip', trDur: 1.4, loc: 'tower', gy: 1240, from: [1700, 1150, 1.35], to: [1760, 1120, 1.5], tau: 10, light: 'cold', lamp: { lx: .7, ly: .2, dark: .45 }, fx: 820, fy: 560, snow: { n: 50, speed: .3, a: .7 },
      people: [{ id: c => who(c, ['kaja', 'jonas']), x: 2250, h: 620, face: -1, blur: 3 }, { id: c => who(c, ['anselm', 'elsa']), x: 1250, h: 560, face: 1, blur: 4 }],
      build(S) {
        // the keeper of the bell, lying across the bottom step
        S.body = S.w.add('cast', 'abs', root.WLArt.puppet(ELDER, '#000', { rod: false }), {}); const sv = S.body.querySelector('svg'); sv.style.width = '100%'; sv.style.height = '100%'; sv.style.overflow = 'visible';
        Object.assign(S.body.style, { left: '1640px', top: '833px', width: '220px', height: '460px', transformOrigin: '50% 94%', transform: 'rotate(-86deg)', color: 'var(--ink)', zIndex: 1300 });
      } }),
  };
  // あなたは、老人の手のひらに気づいた（縄で擦りむけて）
  const ROPE = `<svg viewBox="0 0 60 1400" width="100%" height="100%" preserveAspectRatio="none" style="overflow:visible"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" d="M30 0 C 26 300 34 700 30 1180"/><path fill="none" stroke="var(--paper)" stroke-width="3" opacity=".35" stroke-dasharray="10 14" d="M30 0 C 26 300 34 700 30 1180"/><path fill="currentColor" d="M14 1170 h32 l10 60 l-8 40 l6 70 l-12 -36 l-6 50 l-6 -54 l-10 34 l2 -64 z"/></svg>`;
  P.p9 = {
    n: K.insert({ loc: 'tower', cold: true, lamp: { lx: .55, ly: .2, dark: .5 }, blurBg: 12, items: [{ svg: ROPE, x: 1180, y: -60, w: 70, h: 1420 }],
      from: [1200, 560, 1.25], to: [1210, 980, 1.25], tau: 7, fx: 960, fy: 420,
      draw(S, t) { S.it[0].style.transformOrigin = '50% 0'; S.it[0].style.transform = `rotate(${(Math.sin(t * 1.1) * 1.6 * Math.exp(-t * .08)).toFixed(3)}deg)`; } }),
  };
  // 村の者と、足止めされた旅人たちが、白樺亭の食堂に集められた
  P.p10 = {
    n: K.crowd({ loc: 'inn/in', dir: -1, dark: .7, tau: 12, max: 8, ids: c => c.people }),
    cast: K.portrait({ loc: 'inn/in' }),
  };
  // 暖炉の火が爆ぜた。あなたは自分の荷物に目を落とす。
  P.role = {
    n: K.insert({ tr: 'fade', trDur: 1, loc: 'inn/in', blurBg: 7, items: [], from: [1200, 860, 1.45], to: [1200, 840, 1.6], tau: 10, lamp: { lx: .5, ly: .6, dark: .82, r: 46, ba: .8, br: 1100 }, fx: 960, fy: 520,
      build(S) { S.sp = K.sparks(S.w, 'fx', 22); S.w.add('cast', 'abs', '', { left: '1000px', top: '960px', width: '400px', height: '140px', background: 'radial-gradient(closest-side,rgba(255,170,70,.95),rgba(255,120,40,.4) 60%,transparent)', mixBlendMode: 'screen', filter: 'blur(6px)' }); },
      draw(S, t) { K.drawSparks(S.sp, t, 1200, 1040, { per: 2.4, spread: 160, rise: 560 }); } }),
  };

  // the openings of the other heroes and anything unwritten: a wide view of the place, or the speaker from the waist up
  const LOCS = { tower: [1500, 620, 1.0], inn: [1200, 760, 1.05], forge: [1500, 700, 1.05], mill: [700, 700, 1.05], grave: [1300, 700, 1.0] };
  function generic(sh, c) {
    const pg = (c.st.text.prologue || []).find(p => p.sid === sh.sid) || {}, loc = pg.bg || 'tower', night = !!pg.night, a = LOCS[loc] || [1200, 700, 1];
    const n = parseInt((sh.sid.split(':')[2]) || '0', 10) || 0, dir = n % 2 ? -1 : 1;
    if (sh.part === 'line') return K.mcu({ loc: loc === 'inn' ? 'inn/in' : loc, night, side: dir > 0 ? 'R' : 'L', blurBg: 13, cold: loc !== 'inn' && loc !== 'forge' });
    // inside the inn: the room by the hearth, the camera drifting along the tables
    if (loc === 'inn') return K.est({ loc: 'inn/in', gy: 1000, ww: 2600, blurBg: 4, snow: false, from: [1300 - dir * 300, 640, 1.12], to: [1300 + dir * 120, 610, 1.2], tau: 10, light: 'warm', lamp: { lx: .5, ly: .62, dark: .7, r: 60, seed: 8 + n }, fx: W / 2, fy: 430 });
    return K.est({ loc, night, from: [a[0] - dir * 260, a[1] + 40, a[2] + .04], to: [a[0] + dir * 160, a[1], a[2]], tau: 9, light: night ? 'night' : loc === 'inn' || loc === 'forge' ? 'warm' : 'cold', lamp: loc === 'inn' || loc === 'forge' ? { lx: .5, ly: .45, dark: .55 } : undefined, fx: W / 2, fy: 430 });
  }

  root.WL_SHOTS = root.WL_SHOTS || {};
  root.WL_SHOTS.kirigane = { pages: P, generic };
})(window);
