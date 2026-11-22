/* 所蔵品：ツタンカーメンのセネト盤（エジプト博物館 JE 62058、Carter No. 345 / 383 / 580） — units: 1 = 1 cm.
   After Howard Carter's object cards (Griffith Institute): an oblong games-box of ebony and ivory, a board on the top (30 squares)
   and on the bottom (20), the playing squares of ivory divided by narrow ebony strips; a long ebony drawer for the pieces at one
   end (its bolts and staples wrenched away); the sides, end and drawer front carry hieroglyphic texts, incised and filled with a
   light-yellow pigment imitating ivory. The stand: an open-work stool of ebony on a sledge, four feline legs with ivory claws,
   the rest of the decoration gold, the top frame rebated to take the box. Box 44.4 × 14.3 × 8.1; drawer 22.2 × 9.5 × 4.0;
   stand (with sledge) 55.0 × 17.5 × 20.2; 28 high overall (Carter). The pieces kept with it: two ivory knuckle-bones and two
   pairs of casting sticks, black ebony above and white ivory below, one pair ending in fingers, one in fox heads (about 17.5 long).
   Estimates: the wording and layout of the texts (Tutankhamun's throne name in cartouches, the rest in the manner of royal
   texts), the signs on squares 15 and 26–29 follow a modern replica (the museum's photographs do not show them clearly).
   Checked 2026-11-21 against photographs of the set in the Egyptian Museum (Global Egyptian Museum 15033; egypt-museum.com): brown
   ebony, one band of text in the upper middle of the sides, legs with a heavy thigh, ribbed gold drums under the paws, runners with
   upturned ends and cross-bars; shown as displayed, the drawer open and reels and cones on the board. */
(function () {
  'use strict';
  const HERE = (document.currentScript && document.currentScript.src) || location.href; let TXT = null;
  (window.AtlasEx = window.AtlasEx || {}).senet = {
    build(TT, X, K) {
      const G = new TT.Group();
      const STH = 17.0, L = 44.4, W = 14.3, BH = 8.1, Y0 = STH - .3;   // STH: the stand's height, measured on the museum's photographs (about 17: legs and drums 14.2, frame 1.8, runner 1.0 — overall about 25), not the 20.2 / 28 of Carter's card //   // box length, width, height, its bottom (28 overall; it sits .3 down in the stand's rebate)
      const SQ = 3.72, ST = .62,   // (the strips about a sixth of a square wide: the museum's photograph)
      ROWS = 3, COLS = 10;
      const fieldW = COLS * SQ + (COLS + 1) * ST, fieldD = ROWS * SQ + (ROWS + 1) * ST;
      /* ---------- materials ---------- */
      const ebonyT = K.tex(512, 512, (g, w, h) => K.grain(g, w, h, { a: '#3d2c20', b: '#231710', seed: 3, sx: 1, sy: 30, warp: 1.6, pores: .012 }), { rep: [2, 1] });
      const ebonyR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#8a8a8a', b: '#5c5c5c', seed: 5, sy: 30 }), { data: true, rep: [2, 1] });
      const ebony = K.mat({ map: ebonyT, roughnessMap: ebonyR, color: '#ffffff', roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .45 });
      const ivoryT = K.tex(512, 512, (g, w, h) => { K.grain(g, w, h, { a: '#e8dab9', b: '#d3bf96', seed: 9, sx: 1, sy: 3, warp: 1.2 });
        // a few age cracks along the grain
        g.strokeStyle = 'rgba(90,60,30,.18)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); let x = (i * 97) % w, y = (i * 53) % h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 6 + (k % 3); y += (k % 2 ? 2 : -2); g.lineTo(x, y); } g.stroke(); } });
      const ivory = K.mat({ map: ivoryT, color: '#ffffff', roughness: .42, metalness: 0, clearcoat: .2, clearcoatRoughness: .5 });
      const gold = K.mat({ color: '#e2b65a', roughness: .32, metalness: 1 });
      /* ---------- the box ---------- */
      // the texts round the box: incised in the ebony and filled with a light-yellow paste (Carter); Tutankhamun's throne name
      // Nebkheperure in cartouches, the rest in the manner of a royal text (the real wording is not reproduced here)
      const HF = '"Noto Sans Egyptian Hieroglyphs"';
      // The texts are the king's own, as Carter copied them from the box (card 345-06): side a, read from the drawer's end, the five
      // names — Horus Ka-nakht Tut-mesut, Two Ladies Nefer-hepu Segereh-tawy, Golden Horus Wetjes-khau Sehetep-netjeru, King of Upper and
      // Lower Egypt Nebkheperure; side b "the good god, lord of the Two Lands, lord of action, Nebkheperure, son of Re, Tutankhamun";
      // the far end "given life, stability and dominion like Re for ever"; round the drawer's opening a frame of the same names.
      // A token is one sign, two signs stacked [top, bottom], or a ring with a name ('C1' Nebkheperure, 'C2' Tutankhamun).
      const RING = { C1: ['\u{131F3}', '\u{131A3}', '\u{133E5}', '\u{1339F}'], C2: ['\u{131CB}', '\u{133E0}', '\u{13216}', '\u{133CF}', '\u{13171}', '\u{133CF}', '\u{132F9}'] };
      const yel = 'rgba(214,160,84,.92)';
      // a row of signs in a box x0..x0+ww, centred on cy, bh high; returns nothing. Signs are fitted to the row, the stacked ones half height.
      const row = (g, toks, x0, cy, ww, bh) => { const ft = (c, x, y) => { g.lineWidth = bh * .028; g.lineJoin = 'round'; g.strokeText(c, x, y); };   // (the signs are cut as thin outlines, not filled shapes: the museum photograph)
        g.fillStyle = g.strokeStyle = yel; g.textBaseline = 'middle'; g.textAlign = 'left';
        const F = n => { g.font = `${Math.round(bh * n)}px ${HF}`; }, wOf = t => { if (RING[t]) return bh * (t === 'C1' ? 2.3 : 3.3); if (Array.isArray(t)) { F(.46); return Math.max(...t.map(c => g.measureText(c).width)); } F(.92); return g.measureText(t).width; };
        const ws = toks.map(wOf), gap = bh * .07, nat = ws.reduce((a, c) => a + c, 0) + gap * (toks.length - 1), k = Math.min(1.25, ww / nat); let x = x0 + (ww - nat * k) / 2;
        toks.forEach((t, i) => { const wd = ws[i] * k; g.save(); g.translate(x, cy); g.scale(k, 1);
          if (RING[t]) { const cw = ws[i], ch = bh * .96; g.lineWidth = bh * .05; g.beginPath(); g.roundRect(0, -ch / 2, cw - bh * .1, ch, ch / 2); g.stroke(); g.beginPath(); g.moveTo(cw - bh * .04, -ch * .42); g.lineTo(cw - bh * .04, ch * .42); g.stroke();
            F(.6); const inner = RING[t], iw = inner.reduce((a, c) => a + g.measureText(c).width, 0), kk = Math.min(1, (cw - bh * .55) / iw); let xx = bh * .22; inner.forEach(c => { g.save(); g.translate(xx, 0); g.scale(kk, 1); ft(c, 0, 0); g.restore(); xx += g.measureText(c).width * kk; }); }
          else if (Array.isArray(t)) { F(.46); t.forEach((c, j) => ft(c, (ws[i] - g.measureText(c).width) / 2, (j ? .25 : -.25) * bh)); }
          else { F(.92); ft(t, 0, 0); }
          g.restore(); x += wd + gap * k; }); };
      const textTex = (len, ht, toks, mirror, real) => { const PX = 2048, s = PX / len; return K.tex(PX, Math.round(ht * s), (g, w, h) => {
        g.drawImage(ebonyT.image, 0, 0, w, h);
        if (real === 'end' && TXT) { const bh2 = s * 2.1, k = bh2 / TXT.height, len = w - s * 1.0; g.globalAlpha = .78; g.drawImage(TXT, 900, 0, len / k, TXT.height, s * .5, h * .52 - bh2 / 2, len, bh2); g.globalAlpha = 1; return; }
        if (real && TXT) { if (!mirror) { g.translate(w, 0); g.scale(-1, 1); }   /* (the far side, as the museum's small photograph of it shows: it too starts at the drawer's end and closes with the king's ring at the other — the near side's inscription, turned to read that way) */ const iw = w * .984, ih = iw * TXT.height / TXT.width; g.globalAlpha = .78; g.drawImage(TXT, w * .006, h * .52 - ih / 2, iw, ih); g.globalAlpha = 1; return; }   // the side toward the visitor: the inscription itself, lifted from a photograph of the box in its case (thin incised outlines, a few signs filled)
        const cy = h * .53, bh = s * 2.1;   // one band a little below the middle (the museum's photograph)
        if (mirror) { g.translate(w, 0); g.scale(-1, 1); }   // read from the right: the signs face the other way
        g.strokeStyle = yel; g.lineWidth = s * .05; [cy - bh / 2 - s * .14, cy + bh / 2 + s * .14].forEach(y => { g.beginPath(); g.moveTo(s * .3, y); g.lineTo(w - s * .3, y); g.stroke(); });
        row(g, toks, s * .5, cy, w - s * 1.0, bh);
      }); };
      const T = (...a) => a.map(c => Array.isArray(c) ? c.map(q => String.fromCodePoint(q)) : typeof c === 'number' ? String.fromCodePoint(c) : c);
      const NAMES = T(0x132F9, 0x13143, 0x130D2, 0x130A1, [0x133CF, 0x133CF], 0x13171, 0x1311F, [0x132F4, 0x133CF], 0x13171, 0x13152, 0x13124, [0x13254, 0x132AA], 0x13171, 0x132F4, [0x133BC, 0x1308B], 0x1339B, [0x131FE, 0x131FE], 0x13149, 0x1335E, [0x1320D, 0x133E5], 0x132F4, 0x132B5, [0x133CF, 0x132AA], 0x132B9, 0x132B9, 0x132B9, 0x131D3, 0x131A4, [0x133CF, 0x133CF], 'C1');
      const SIDEB = T(0x132F9, 0x132B9, 0x13124, 0x1339F, [0x131FE, 0x131FE], 0x1339F, [0x13079, 0x133CF], [0x1340D, 0x133CF], 0x131D3, 0x131A4, [0x133CF, 0x133CF], 'C1', 0x1316D, 0x131F3, 'C2', [0x133D9, 0x132F9], 0x13193, [0x133CF, 0x131FE]);
      const ENDT = T(0x133D9, 0x132F9, 0x132BD, 0x13300, [0x133C7, 0x131F3], 0x13193, [0x133CF, 0x131FE]);
      const sideT = textTex(L, BH, NAMES, true, true), sideT2 = textTex(L, BH, SIDEB, false, true)   /* (no photograph of the far side was found: it carries the same inscription as the near side, by the owner's decision 2026-11-22 — better than a typeface) */, endT = textTex(W, BH, ENDT, false, 'end');
      // the drawer's end of the box: a frame of text round the opening (Carter's sketch c)
      const frameT = K.tex(1024, Math.round(1024 * BH / W), (g, w, h) => { g.drawImage(ebonyT.image, 0, 0, w, h); const s = w / W, hx0 = (W - 9.5) / 2 * s, hx1 = w - hx0, hy1 = h - .9 * s, hy0 = hy1 - 4.0 * s, bh = s * 1.15;
        if (TXT) { const k = bh / TXT.height, seg = (sx, len, dx, dy, rot) => { g.save(); g.translate(dx, dy); g.rotate(rot); g.globalAlpha = .78; g.drawImage(TXT, sx, 0, len / k, TXT.height, 0, -bh / 2, len, bh); g.restore(); };   // (no photograph shows this end well enough to read: the frame round the drawer's opening is filled with lengths of the long side's inscription rather than a typeface)
          const tw = hx1 - hx0 + s * 2.6; seg(60, tw, hx0 - s * 1.3, hy0 - bh * .62, 0); const sh = hy1 - hy0 + s * .2; seg(1500, sh, hx0 - s * .68, hy0, Math.PI / 2); seg(2300, sh, hx1 + s * .68, hy0, Math.PI / 2); return; }
        row(g, T('C1', 0x132B9, 0x13124, 0x1339F, [0x131FE, 0x131FE], 0x133D9, 0x132F9), hx0 - s * 1.2, hy0 - bh * .75, hx1 - hx0 + s * 2.4, bh);
        [[hx0 - s * 1.1, T(0x132F9, 0x13143, 0x130D2, 0x130A1)], [hx1 + s * 1.1, T(0x13152, 0x13124, 0x13254, 0x132AA)]].forEach(([x, tk]) => tk.forEach((c, i) => { g.font = `${Math.round(bh * .8)}px ${HF}`; g.textAlign = 'center'; g.fillText(c, x, hy0 + (i + .5) * (hy1 - hy0) / 4); }));
        g.strokeStyle = yel; g.lineWidth = s * .05; g.strokeRect(hx0 - s * 2.0, hy0 - bh * 1.45, hx1 - hx0 + s * 4.0, hy1 - hy0 + bh * 1.55); });
      const mkT = map => K.mat({ map, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .45 });
      const sideM = mkT(sideT), sideM2 = mkT(sideT2), endM = mkT(endT), frameM = mkT(frameT);
      const box = new TT.Mesh(new TT.BoxGeometry(L, BH, W), [frameM, endM, ebony, ebony, sideM, sideM2]); box.position.set(0, Y0 + BH / 2, 0); G.add(box);
      // the top field: one ivory slab, the raised ebony strips over it (the square signs are painted on the slab's texture)
      // the signs on squares 15 and 26–29, after a careful modern replica of this board (the owner's photographs): cut as outlines — each
      // stroke a pair of fine lines — and large in their squares. 15: the ka's two arms holding an ankh, lying with its top toward the
      // start of the row; 26: three nefer signs standing, the round end downward; 27: five rows of water; 28: three storks (the bas);
      // 29: two kneeling men, arms raised. The last four stand upright for a player sitting at the long side.
      const signs = { 15: 'ka', 26: 'nfr', 27: 'water', 28: 'birds', 29: 'men' };
      const topT = K.tex(2048, Math.round(2048 * fieldD / fieldW), (g, w, h) => {
        const s = w / fieldW; g.drawImage(ivoryT.image, 0, 0, w, h);
        const lay = document.createElement('canvas'); lay.width = w; lay.height = h; const q = lay.getContext('2d'); q.lineCap = 'round'; q.lineJoin = 'round';
        const INK = 'rgba(92,50,20,1)', T = .042;   // (T: the fine line, in units of the sign's half-size)
        const thin = fn => { q.beginPath(); fn(); q.strokeStyle = INK; q.lineWidth = T; q.stroke(); };
        const bar = (fn, wd) => { q.beginPath(); fn(); q.strokeStyle = INK; q.lineWidth = wd; q.stroke(); q.globalCompositeOperation = 'destination-out'; q.strokeStyle = '#000'; q.lineWidth = wd - T * 2; q.stroke(); q.globalCompositeOperation = 'source-over'; };   // a stroke as two fine lines
        const hole = fn => { q.beginPath(); fn(); q.globalCompositeOperation = 'destination-out'; q.fillStyle = '#000'; q.fill(); q.globalCompositeOperation = 'source-over'; q.strokeStyle = INK; q.lineWidth = T; q.stroke(); };   // a closed shape that covers what lies behind it
        const DRAW = {
          ka() { bar(() => { q.moveTo(-.72, .78); q.lineTo(.72, .78); }, .1);
            [-1, 1].forEach(d => { bar(() => { q.moveTo(d * .66, .7); q.lineTo(d * .66, -.2); q.bezierCurveTo(d * .66, -.5, d * .9, -.5, d * .92, -.78); }, .12); thin(() => { q.moveTo(d * .92, -.78); q.lineTo(d * .62, -.62); q.moveTo(d * .92, -.78); q.lineTo(d * .98, -.6); }); hole(() => q.arc(d * .66, .74, .085, 0, 6.29)); });
            bar(() => { q.moveTo(0, .72); q.lineTo(0, -.05); }, .13); bar(() => { q.moveTo(-.3, -.05); q.lineTo(.3, -.05); }, .11);
            hole(() => { q.moveTo(0, -.1); q.bezierCurveTo(-.5, -.45, -.25, -.86, 0, -.86); q.bezierCurveTo(.25, -.86, .5, -.45, 0, -.1); }); thin(() => { q.moveTo(0, -.24); q.bezierCurveTo(-.3, -.48, -.15, -.72, 0, -.72); q.bezierCurveTo(.15, -.72, .3, -.48, 0, -.24); }); },
          nfr() { [-.58, 0, .58].forEach(x => { bar(() => { q.moveTo(x, .3); q.lineTo(x, -.9); }, .1); thin(() => { q.moveTo(x - .17, -.62); q.lineTo(x + .17, -.62); q.moveTo(x - .17, -.76); q.lineTo(x + .17, -.76); });
            hole(() => q.ellipse(x, .58, .22, .32, 0, 0, 6.29)); thin(() => q.ellipse(x, .6, .15, .23, 0, 0, 6.29)); thin(() => q.ellipse(x, .62, .08, .14, 0, 0, 6.29)); }); },
          water() { for (let j = -2; j <= 2; j++) bar(() => { const y = j * .3; q.moveTo(-.86, y + .08); for (let k = 1; k <= 12; k++) q.lineTo(-.86 + k * .1433, y + (k % 2 ? -.08 : .08)); }, .1); q.lineJoin = 'round'; },
          birds() { thin(() => { q.moveTo(-.2, .8); q.lineTo(.75, .8); });
            [2, 1, 0].forEach(j => { const x = -.05 + j * .22, y = j * -.03;   // the nearest bird last, over the others
              thin(() => { [-.1, .06].forEach(d => { q.moveTo(x + d, y + .3); q.lineTo(x + d, .8); q.lineTo(x + d + .12, .8); }); });
              hole(() => { q.moveTo(-.92 + j * .1, y + .12); q.bezierCurveTo(x - .5, y - .05, x - .3, y - .12, x + .05, y - .1); q.bezierCurveTo(x + .3, y - .08, x + .3, y + .34, x - .02, y + .36); q.bezierCurveTo(x - .3, y + .36, x - .5, y + .22, -.92 + j * .1, y + .12); });
              bar(() => { q.moveTo(x + .16, y + .05); q.bezierCurveTo(x + .34, y - .1, x + .08, y - .4, x + .22, y - .62); }, .1);
              hole(() => q.ellipse(x + .25, y - .68, .1, .08, 0, 0, 6.29)); thin(() => { q.moveTo(x + .33, y - .7); q.lineTo(x + .52, y - .62); q.lineTo(x + .33, y - .64); }); }); },
          men() { [-.48, .42].forEach(x => { thin(() => { q.moveTo(x - .4, .8); q.lineTo(x + .42, .8); });
              hole(() => { q.moveTo(x - .12, -.3); q.lineTo(x + .1, -.32); q.lineTo(x + .16, .2); q.lineTo(x + .4, .28); q.lineTo(x + .36, .5); q.lineTo(x - .05, .5); q.lineTo(x - .05, .62); q.lineTo(x + .34, .62); q.lineTo(x + .34, .76); q.lineTo(x - .38, .76); q.lineTo(x - .3, .5); q.lineTo(x - .18, .3); q.closePath(); });   // the body, kneeling on one knee
              [0, .14].forEach(d => bar(() => { q.moveTo(x + .02, -.2 + d); q.lineTo(x + .26, -.12 + d); q.lineTo(x + .5, -.42 + d); }, .11));   // both arms raised before him
              hole(() => q.arc(x, -.5, .16, 0, 6.29)); thin(() => { q.moveTo(x - .16, -.52); q.bezierCurveTo(x - .2, -.74, x + .12, -.74, x + .14, -.58); q.moveTo(x - .16, -.5); q.lineTo(x - .2, -.3); }); }); },
        };
        for (let n = 1; n <= 30; n++) {
          const sg = signs[n]; if (!sg) continue;
          const r = Math.floor((n - 1) / 10), k = (n - 1) % 10, c = r === 1 ? 9 - k : k;   // the boustrophedon path: 1–10 → 11–20 ← 21–30 →
          const cx = (ST + c * (SQ + ST) + SQ / 2) * s, cy = (ST + r * (SQ + ST) + SQ / 2) * s, u = SQ * s * .4;
          q.save(); q.translate(cx, cy); q.rotate(sg === 'ka' ? -Math.PI / 2 : 0); q.scale(u, u); DRAW[sg](); q.restore();
        }
        g.drawImage(lay, 0, 0);
      });
      const topMat = K.mat({ map: topT, color: '#ffffff', roughness: .42, clearcoat: .2, clearcoatRoughness: .5 });
      const slab = new TT.Mesh(new TT.BoxGeometry(fieldW, .12, fieldD), [ebony, ebony, topMat, ebony, ebony, ebony]); slab.position.set(0, Y0 + BH + .06, 0); G.add(slab);
      // raised strips: rows and columns (and the outer frame), ebony
      const SH = .22, strips = [];
      for (let r = 0; r <= ROWS; r++) strips.push([fieldW, ST, 0, -fieldD / 2 + ST / 2 + r * (SQ + ST)]);
      for (let c = 0; c <= COLS; c++) strips.push([ST, fieldD, -fieldW / 2 + ST / 2 + c * (SQ + ST), 0]);
      strips.forEach(([w, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, SH, d), ebony); m.position.set(x, Y0 + BH + .12 + SH / 2, z); G.add(m); });
      // a thin ivory edge where the field meets the ebony
      const band = (w, d, y, x = 0, z = 0) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .2, d), ivory); m.position.set(x, y, z); G.add(m); };
      // the drawer at the +x end (22.2 long, 9.5 wide, 4 high), shown pulled out as in the museum's photographs
      const DL = 22.2, DWd = 9.5, DHt = 4.0, DOUT = 8.5, dg = new TT.Group(); dg.position.set(L / 2 + DOUT - DL / 2, Y0 + .9 + DHt / 2, 0); G.add(dg);
      const dpart = (w, h, d, x, y, z, m) => { const o = new TT.Mesh(new TT.BoxGeometry(w, h, d), m || ebony); o.position.set(x, y, z); dg.add(o); };
      dpart(.35, DHt, DWd, DL / 2 - .175, 0, 0, ebony);   // front
      dpart(DL - .35, DHt - .2, .3, -.175, -.1, DWd / 2 - .15); dpart(DL - .35, DHt - .2, .3, -.175, -.1, -DWd / 2 + .15);   // sides
      dpart(.3, DHt - .2, DWd - .6, -DL / 2 + .15, -.1, 0); dpart(DL - .35, .25, DWd - .6, -.175, -DHt / 2 + .125, 0, K.mat({ color: '#4a3324', roughness: .85 }));   // back, rough floor
      { const hm = K.mat({ color: '#0a0605', roughness: 1 }), hg = new TT.CylinderGeometry(.11, .11, .06, 10); hg.rotateZ(Math.PI / 2); [[-1.5, .45], [-1.5, -.45], [1.5, .45], [1.5, -.45]].forEach(([z, y]) => { const sc = new TT.Mesh(hg, hm); sc.position.set(DL / 2 + .005, y, z); dg.add(sc); }); }   // four small holes: the staples of the bolt, wrenched away (the museum's photograph)
      { const st = new TT.Mesh(new TT.TorusGeometry(.32, .07, 8, 16, Math.PI), gold); st.rotation.set(0, Math.PI / 2, -Math.PI / 2); st.position.set(L / 2 + .02, Y0 + .9 + DHt / 2, DWd / 2 + .85); G.add(st); }   // one gold staple still on the box's end, beside the drawer   // where the bolt's staples were wrenched away
      const hole = new TT.Mesh(new TT.BoxGeometry(.05, DHt, DWd), K.mat({ color: '#080504', roughness: 1 })); hole.position.set(L / 2 + .03, Y0 + .9 + DHt / 2, 0); G.add(hole);   // the empty opening in the box's end
      /* ---------- pieces on the board, as the set is shown in the museum: reels and cones (ivory; two cones blue faience) ---------- */
      const faience = K.mat({ color: '#6fa9a0', roughness: .45, clearcoat: .3 });
      const reelG = new TT.LatheGeometry([[0, 0], [.95, 0], [1.0, .12], [.62, .35], [.5, .9], [.62, 1.35], [.98, 1.55], [.9, 1.66], [0, 1.66]].map(([x, y]) => new TT.Vector2(x, y)), 24);
      const coneG = new TT.LatheGeometry([[0, 0], [.95, 0], [1.0, .15], [.7, .5], [.42, 1.6], [.3, 2.4], [.34, 2.7], [.2, 2.9], [0, 2.95]].map(([x, y]) => new TT.Vector2(x, y)), 24);
      const sqc = (c, r) => [-fieldW / 2 + ST + c * (SQ + ST) + SQ / 2, Y0 + BH + .12, -fieldD / 2 + ST + r * (SQ + ST) + SQ / 2];
      const reelM = K.mat({ color: '#b4b89c', roughness: .6 }), disp = [];   // disp: the things laid out for show — put away while a game is played on the board (atlas/museum/play.js)
      [[0, 0], [2, 0], [3, 1], [5, 0], [1, 2]].forEach(([c, r]) => { const m = new TT.Mesh(reelG, reelM); m.position.set(...sqc(c, r)); m.scale.setScalar(.82); G.add(m); disp.push(m); });
      [[6, 1], [4, 2], [8, 1], [9, 2], [9, 0]].forEach(([c, r], i) => { const m = new TT.Mesh(coneG, i === 1 || i === 3 ? faience : ivory); m.position.set(...sqc(c, r)); m.scale.set(.75, .9, .75); G.add(m); disp.push(m); });
      /* ---------- the stand: rails, four animal legs on drums, two sledge runners ---------- */
      const RL = 46.0, RW = 16.2, RH = 1.8;   // the top frame (rebated for the box)
      [[RL, RH, .9, 0, RW / 2 - .45], [RL, RH, .9, 0, -RW / 2 + .45], [.9, RH, RW, RL / 2 - .45, 0], [.9, RH, RW, -RL / 2 + .45, 0]].forEach(([w, h, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, h, d), ebony); m.position.set(x, STH - h / 2, z); G.add(m); });
      // the ledge inside the frame the box rests on
      [[RL - 1.8, .3, .6, 0, RW / 2 - 1.2], [RL - 1.8, .3, .6, 0, -RW / 2 + 1.2]].forEach(([w, h, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, h, d), ebony); m.position.set(x, Y0 - .15, z); G.add(m); });
      const gilt = (w, d, x, z) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .14, d), gold); m.position.set(x, STH - RH + .07, z); G.add(m); };   // gold bands at the foot of the frame
      gilt(RL + .02, .92, 0, RW / 2 - .45); gilt(RL + .02, .92, 0, -RW / 2 + .45);
      // the legs: a lion's — two forelegs at the drawer's end, two hind legs behind, all four facing the same way (the museum's side
      // view): a broad block under the frame, the limb narrowing to the ankle, the hind legs bent back at the hock; the paw on a ribbed gold drum
      const prof = pts => { const sh = new TT.Shape(); sh.moveTo(pts[0][0], pts[0][1]); sh.splineThru(pts.slice(1).map(([x, y]) => new TT.Vector2(x, y))); sh.closePath(); return sh; };
      const PAW = [[-.62, .02], [.6, .0], [1.5, .0], [1.92, .2], [1.9, .72], [1.45, 1.12], [.85, 1.32]];
      const fore = prof([[-1.25, 10.3], [-1.25, 9.4], [-1.05, 8.2], [-.78, 6.6], [-.66, 4.8], [-.7, 3.2], [-.92, 2.6], [-.7, 2.15], [-.62, 1.2], [-.78, .5], ...PAW, [.52, 1.9], [.5, 3.0], [.6, 4.4], [.86, 5.9], [.9, 7.4], [1.1, 8.6], [1.25, 9.4], [1.25, 10.3]]);
      const hind = prof([[-1.25, 10.3], [-1.3, 9.4], [-1.42, 8.2], [-1.1, 6.9], [-.95, 5.9], [-1.3, 5.0], [-.78, 4.3], [-.52, 3.2], [-.5, 2.0], [-.72, .6], ...PAW, [.5, 1.9], [.36, 3.0], [.3, 4.2], [.62, 5.4], [1.15, 6.8], [1.32, 8.0], [1.25, 9.4], [1.25, 10.3]]);
      const legOpt = { depth: 1.9, bevelEnabled: true, bevelThickness: .34, bevelSize: .3, bevelSegments: 5, curveSegments: 6 };
      const foreG = new TT.ExtrudeGeometry(fore, legOpt), hindG = new TT.ExtrudeGeometry(hind, legOpt); [foreG, hindG].forEach(q => { q.translate(0, 0, -.95); q.scale(1.26, 1, 1); });   // (stout legs: the photographs)
      const toeG = new TT.CapsuleGeometry(.34, 1.5, 6, 12); toeG.rotateZ(.98);   // a toe: long and round, running down over the front of the paw (four side by side; no claws show)
      const dewG = new TT.ConeGeometry(.16, .5, 8); dewG.rotateZ(Math.PI / 2 + .5);
      const drumG = new TT.LatheGeometry([[0, -.65], [1.55, -.65], [1.62, -.56], [1.47, -.44], [1.54, -.32], [1.39, -.2], [1.46, -.08], [1.31, .04], [1.38, .16], [1.23, .28], [1.3, .4], [1.16, .52], [1.2, .65], [0, .65]].map(([x, y]) => new TT.Vector2(x, y)), 28);
      const RUN = .95, LX = RL / 2 - 1.9, LZ = RW / 2 - 1.05, LY = RUN + 1.3, LS = (STH - RH - LY) / 10.3;   // the runner's thickness; the legs stretched to the stand's height
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const x = sx * LX, z = sz * LZ;
        const leg = new TT.Mesh(sx > 0 ? foreG : hindG, ebony); leg.position.set(x, LY, z); leg.scale.set(1, LS, 1); G.add(leg);
        for (let k = -1.5; k <= 1.5; k++) { const t = new TT.Mesh(toeG, ebony); t.position.set(x + 2.2, LY + 1.0, z + k * .58); t.scale.set(1, 1, .9); G.add(t); }
        const dr = new TT.Mesh(drumG, gold); dr.position.set(x + .95, RUN + .65, z); G.add(dr);
        for (let k = 0; k < 5; k++) { const rg = new TT.Mesh(new TT.TorusGeometry(1.52 - k * .075, .1, 6, 24), gold); rg.rotation.x = Math.PI / 2; rg.position.set(x + .95, RUN + .14 + k * .26, z); G.add(rg); }   // the drum's ribs
        const dw = new TT.Mesh(dewG, gold); dw.position.set(x - 1.2, LY + 2.5 * LS, z + sz * .5); G.add(dw);   // a gold dew-claw at the back of the leg
           // the gilt strap inside the top of each leg
      }
      // the sledge: two thin flat runners, both ends curling up; a flat cross-bar joins them inside each pair of feet
      const RLn = 55, rs = new TT.Shape(), E = RLn / 2;
      rs.moveTo(-E + 4.2, 0); rs.lineTo(E - 4.2, 0); rs.bezierCurveTo(E - 1.6, 0, E + .1, .7, E, 1.9); rs.quadraticCurveTo(E - .05, 2.55, E - .6, 2.55); rs.quadraticCurveTo(E - 1.15, 2.5, E - 1.3, 1.95);
      rs.bezierCurveTo(E - 1.6, 1.3, E - 2.6, RUN, E - 4.2, RUN); rs.lineTo(-E + 4.2, RUN); rs.bezierCurveTo(-E + 2.6, RUN, -E + 1.6, 1.3, -E + 1.3, 1.95);
      rs.quadraticCurveTo(-E + 1.15, 2.5, -E + .6, 2.55); rs.quadraticCurveTo(-E + .05, 2.55, -E, 1.9); rs.bezierCurveTo(-E - .1, .7, -E + 1.6, 0, -E + 4.2, 0);
      const runG = new TT.ExtrudeGeometry(rs, { depth: 2.9, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 16 }); runG.translate(0, 0, -1.45);
      [LZ, -LZ].forEach(z => { const m = new TT.Mesh(runG, ebony); m.position.set(0, 0, z); G.add(m); });
      [LX - 3.2, -LX - 3.6].forEach(x => { const m = new TT.Mesh(new TT.BoxGeometry(2.6, .7, 2 * LZ - 2.7), ebony); m.position.set(x, .5, 0); G.add(m); });
      /* ---------- the pieces kept with it: two knuckle-bones and two pairs of casting sticks (black ebony over white ivory) ---------- */
      // the casting sticks as they lie in the museum's case: long slender rods of brown wood, rounded on the back and cut with bands of
      // lines and zigzags, one end drawn out to a finger-tip (Carter: black above, white below; one pair ends in fox heads)
      const stT = K.tex(512, 64, (g, w, h) => { g.drawImage(ebonyT.image, 0, 0, w, h); g.fillStyle = 'rgba(120,80,48,.18)'; g.fillStyle = 'rgba(20,10,6,.35)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(168,128,92,.75)'; g.lineWidth = 1.4;
        for (let x = 30; x < w - 60; x += 78) { [0, 7, 44, 51].forEach(d => { g.beginPath(); g.moveTo(x + d, 0); g.lineTo(x + d, h); g.stroke(); }); g.beginPath(); for (let k = 0; k <= 6; k++) { const xx = x + 10 + k * 5.4, yy = k % 2 ? h * .2 : h * .8; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); } });
      const stM = K.mat({ map: stT, color: '#ffffff', roughness: .6 });
      const stickG = (() => { const pts = [[0, -8.6], [.3, -8.5], [.52, -8.0], [.6, -6.5], [.62, 0], [.6, 5.6], [.52, 6.6], [.44, 7.2], [.5, 7.6], [.42, 8.3], [.2, 8.7], [0, 8.75]].map(([r, y]) => new TT.Vector2(r, y)); const q = new TT.LatheGeometry(pts, 14); q.rotateZ(-Math.PI / 2); q.scale(1, .55, 1); return q; })();
      [[-13, 12.8, .03], [-12.4, 15.0, -.02]].forEach(([x, z, ry]) => { const m = new TT.Mesh(stickG, stM); m.position.set(x, .36, z); m.rotation.y = ry; G.add(m); disp.push(m); });
      const amber = K.mat({ color: '#b5651d', roughness: .25, clearcoat: .6, clearcoatRoughness: .2 });
      [[9, 12.6, amber, .2], [12.2, 12.9, amber, 1.1], [15.8, 13.2, ivory, .5]].forEach(([x, z, m, r]) => { const kb = new TT.Mesh(new TT.BoxGeometry(2.2, 1.0, 1.5, 3, 2, 2), m); const P = kb.geometry.attributes.position; for (let i = 0; i < P.count; i++) { const px = P.getX(i), py = P.getY(i), pz = P.getZ(i), pinch = 1 - .28 * Math.cos(px / 1.1 * Math.PI / 2) ; P.setXYZ(i, px, py * (.8 + .2 * Math.abs(px) / 1.1), pz * pinch); } kb.geometry.computeVertexNormals(); kb.position.set(x, .5, z); kb.rotation.y = r; G.add(kb); disp.push(kb); });
      // for a game on this board (所蔵品で遊ぶ, atlas/museum/play.js): the field (top of the ivory, the pitch of the squares), the open drawer, the pieces' and sticks' parts
      G.userData.play = { top: Y0 + BH + .12, pitch: SQ + ST, drawer: { x0: L / 2 + .4, x1: L / 2 + DOUT - .5, y: Y0 + .9 + .25, z: DWd / 2 - .3 }, reelG, coneG, reelM, ivory, faience, ebony, stickG, stM, hide: disp };
      return G;
    },
    ready: () => new Promise(res => { const im = new Image(); im.onload = () => { TXT = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/senet-text.webp', HERE).href; setTimeout(res, 8000); }).then(() => new Promise(res => {   // the hieroglyph font: wait for its stylesheet, then for the face itself
      const go = () => (document.fonts && document.fonts.load ? document.fonts.load('40px "Noto Sans Egyptian Hieroglyphs"', '\u{131F3}\u{1319F}\u{13079}') : Promise.resolve()).catch(() => {}).then(res);
      let l = document.querySelector('link[href*="Egyptian+Hieroglyphs"]');
      if (l && l.sheet) return go();
      if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&display=swap'; document.head.appendChild(l); }
      l.addEventListener('load', go); l.addEventListener('error', res); setTimeout(res, 4000);
    })),
  };
})();
