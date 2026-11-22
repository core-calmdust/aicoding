/* 所蔵品：オスマン帝国のチェス・バックギャモン盤（ヴィクトリア＆アルバート博物館 861-1907） — units: 1 = 1 cm.
   After the V&A's record: a folding board of two leaves, 56.5 × 56.3 cm open and 2.5 cm thick (5.5 cm closed).
   Inside (shown open): backgammon — two tables of turtle shell over gold leaf, six mother-of-pearl cypress points from each long
   side, a fretted medallion between two chains across the middle, drops of green-stained bone, raised framing fillets with
   mother-of-pearl plaques. Outside (turn it over): chess — squares of four-part mother-of-pearl and of turtle shell, each in its own
   frame of light stringing, a border with a mother-of-pearl chain, and a half-round bone lipping round the edge.

   2026-11-23 — rebuilt for relief and exact pattern:
   · Where every piece of inlay lies is taken from the V&A's photographs (2012FP3720 inside, 2012FP3719 outside), set square
     and read at full size (about 30 px to the cm): images/atlas/ex/ottoman-{bg,ch}-{1,2}.webp, made by
     atlas/museum/tools/ottoman-maps.py — mother-of-pearl, the light stringing, the amber of thin shell, the tone of each pearl
     piece, joints and cracks, the green bone / the bone lipping. The materials themselves are drawn by the shader below, from
     these maps: the edges stay sharp however near the camera comes (the maps are smooth fields cut at a threshold).
   · Relief: the shader bumps the surface from the same maps (the fine joint round every piece, the proud stringing, cracks, the
     slight unevenness of old veneer). The raised fillets, the moulding that falls from them to the playing field, the half-round
     bone lipping (mitred at the corners) and the leaves' edges are real geometry.
   · The leaves' edges (V&A 2012FP3721, 2012FT9876): the lipping, stringing, and a row of pearl plaques like the fillets' — the
     fillets' own plaques are used for them (which plaque sits where on the edges is an estimate).
   · Estimates: the moulding's profile (seen only from above), the size of the lipping's section, the hinge pins' height. */
(function () {
  'use strict';
  const HERE = (document.currentScript && document.currentScript.src) || location.href, IMG = {};
  const load = n => new Promise(res => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/ottoman-' + n + '.webp?v=1', HERE).href; setTimeout(res, 12000); });
  (window.AtlasEx = window.AtlasEx || {}).ottoman = {
    flip: true,
    ready: () => Promise.all(['bg-1', 'bg-2', 'ch-1', 'ch-2'].map(n => IMG[n] ? 0 : load(n))),
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 56.5, D = 56.3, LW = W / 2, YF = 2.0, YT = 2.5;   // open width and depth, a leaf's width, the playing field's and the fillets' height
      const GAP = .05, IN1 = 1.3, IN2 = 1.9;                       // half the slit between the leaves; the fillets' inner edge and the foot of the moulding, from a leaf's edge
      const LIPW = .75, LIPH = .6;                                 // the bone lipping's section (quarter round)
      const PX = innerWidth < 820 ? 1536 : 2048, PH = Math.round(PX * 2040 / 2048);
      /* ---------- the maps ----------
         The two grey pictures of a face go to the video card as they are, one byte a pixel (no reading back of pixels, no repacking:
         that took most of the time to open the case and four times the memory). a1 = [ pearl | stringing ], a2 = [ amber | tiles:
         tone, joints / green bone or bone lipping ]. They are not the material's own textures, so the case's rule for phones (no
         picture over 1536 px) is applied here: PX is the width of one half. */
      const atlas = im => { const c = document.createElement('canvas'); c.width = PX * 2; c.height = PH; const g = c.getContext('2d'); if (im) { g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); } else { g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); }
        const t = new TT.CanvasTexture(c); t.format = TT.RedFormat; t.colorSpace = TT.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = TT.LinearMipmapLinearFilter; return t; };
      const maps = f => [atlas(IMG[f + '-1']), atlas(IMG[f + '-2'])];
      // a tile of noise for the materials' own figure: r = soft clouds, g = streaks (the grain of shell and pearl), b = fine speckle
      const grainT = K.tex(512, 512, (g, w, h) => { const n = K.noise(91), n2 = K.noise(17), img = g.createImageData(w, h), d = img.data, P = 6.2832 / w, c8 = v => Math.max(0, Math.min(255, v * 255));
        // (made to repeat without a seam: the noise is read on a torus)
        const tor = (N, x, y, f, o) => N(Math.cos(x * P) * f + 9, Math.sin(x * P) * f + Math.cos(y * P) * f + 5, o) * .5 + N(Math.sin(y * P) * f + 3, Math.cos(y * P + x * P) * f + 7, o) * .5;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; d[i] = c8((tor(n, x, y, 1.6, 4) - .5) * 2.4 + .5); d[i + 1] = c8((tor(n2, x * 1, y * 5, 2.2, 3) - .5) * 2.6 + .5); d[i + 2] = c8((n(x / 3.1, y / 3.1, 2) - .5) * 2 + .5); d[i + 3] = 255; }
        g.putImageData(img, 0, 0); }, { data: true, rep: [1, 1] });
      grainT.generateMipmaps = true; grainT.minFilter = TT.LinearMipmapLinearFilter;
      /* ---------- the inlaid surface ----------
         mode 0 = the backgammon side (B.r is the green-stained bone; the hinges' bone strips are told by their place),
         mode 1 = the chess side (B.r is the bone lipping). */
      const owned = [];
      const face = (f, mode) => { const [A, B] = maps(f); owned.push(A, B);
        const m = new TT.MeshPhysicalMaterial({ map: grainT, color: 0xffffff, roughness: .3, metalness: 0, clearcoat: .1, clearcoatRoughness: .45, specularIntensity: .5 });
        m.onBeforeCompile = sh => { sh.uniforms.uA1 = { value: A }; sh.uniforms.uA2 = { value: B }; sh.uniforms.uGrain = { value: grainT }; sh.uniforms.uMode = { value: mode }; sh.uniforms.uTexel = { value: new TT.Vector2(1 / PX, 1 / PH) };
          sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjView;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjView = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz - position;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
            uniform sampler2D uA1; uniform sampler2D uA2; uniform sampler2D uGrain; uniform float uMode; uniform vec2 uTexel; varying vec3 vObjView;
            // the halves and tiles of the two pictures (kept a hair inside their own part, so a neighbour never bleeds in)
            vec2 ottC(vec2 uv) { return clamp(uv, vec2(0.002), vec2(0.998)); }
            float ottPearl(vec2 uv) { uv = ottC(uv); return texture2D(uA1, vec2(uv.x * 0.5, uv.y)).r; }
            float ottLine(vec2 uv) { uv = ottC(uv); return texture2D(uA1, vec2(0.5 + uv.x * 0.5, uv.y)).r; }
            float ottAmber(vec2 uv) { uv = ottC(uv); return texture2D(uA2, vec2(uv.x * 0.5, uv.y)).r; }
            float ottTone(vec2 uv) { uv = clamp(uv, vec2(0.006), vec2(0.994)); return texture2D(uA2, vec2(0.5 + uv.x * 0.25, 0.5 + uv.y * 0.5)).r; }
            float ottJoint(vec2 uv) { uv = clamp(uv, vec2(0.006), vec2(0.994)); return texture2D(uA2, vec2(0.75 + uv.x * 0.25, 0.5 + uv.y * 0.5)).r; }
            float ottExtra(vec2 uv) { uv = clamp(uv, vec2(0.006), vec2(0.994)); return texture2D(uA2, vec2(0.5 + uv.x * 0.25, uv.y * 0.5)).r; }
            // the surface's height in centimetres (exaggerated a little): the joint round each piece, proud stringing, cracks, the wave of old veneer
            float ottH(vec2 uv) { vec3 a = vec3(ottPearl(uv), 0.0, ottLine(uv)); vec3 b = vec3(0.0, 0.0, ottJoint(uv));
              float joint = 1.0 - smoothstep(0.0, 0.2, abs(a.r - 0.5));
              return smoothstep(0.3, 0.7, a.r) * 0.012 - joint * 0.014 + smoothstep(0.2, 0.6, a.b) * (1.0 - a.r) * 0.012 - b.b * 0.022
                + (texture2D(uGrain, uv * 2.3).r - 0.5) * 0.016 + (texture2D(uGrain, uv * 9.0).r - 0.5) * 0.004 ; }
            vec3 ottPerturb(vec3 p, vec3 n, vec2 dH, float fd) { vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1) * fd;
              vec3 gr = sign(det) * (dH.x * r1 + dH.y * r2); return normalize(abs(det) * n - gr); }`)
            .replace('#include <map_fragment>', `
            vec3 oA = vec3(ottPearl(vMapUv), ottAmber(vMapUv), ottLine(vMapUv)), oB = vec3(ottExtra(vMapUv), ottTone(vMapUv), ottJoint(vMapUv));
            // (how many texels one pixel covers: far away the maps are already averaged, and cutting them at a threshold would make the
            //  thin pieces pop in and out as the board turns — there the maps are used as they are)
            float oFp = max(length(dFdx(vMapUv) / uTexel), length(dFdy(vMapUv) / uTexel)), oFar = smoothstep(0.7, 1.8, oFp);
            float oW = mix(clamp(fwidth(oA.r) * 0.9, 0.03, 0.3), 0.5, oFar), oP = smoothstep(0.5 - oW, 0.5 + oW, oA.r);          // mother-of-pearl (or bone)
            float oL = mix(smoothstep(0.3, 0.62, oA.b), min(1.0, oA.b * 1.15), oFar) * (1.0 - oP);                                                 // the light stringing
            vec3 oG1 = texture2D(uGrain, vMapUv * 5.0).rgb, oG2 = texture2D(uGrain, vMapUv * 23.0 + 0.37).rgb, oG3 = texture2D(uGrain, vMapUv.yx * 31.0).rgb;
            // turtle shell: nearly black-brown, cloudy red-brown where it thins, amber and gold where the leaf shows through
            float oAm = clamp(oA.g * (0.72 + 0.5 * oG2.g) + ((oG3.r - 0.5) * 0.5 + (oG2.b - 0.5) * 0.3) * smoothstep(0.08, 0.4, oA.g) * (1.0 - oFar), 0.0, 1.0);
            vec3 oShell = vec3(0.012, 0.006, 0.006) + vec3(0.022, 0.005, 0.002) * smoothstep(0.5, 0.9, oG1.r * 0.7 + oG2.g * 0.3);
            oShell = mix(oShell, vec3(0.045, 0.011, 0.006), smoothstep(0.2, 0.5, oAm)); oShell = mix(oShell, vec3(0.27, 0.058, 0.009), smoothstep(0.46, 0.7, oAm)); oShell = mix(oShell, vec3(0.62, 0.27, 0.035), smoothstep(0.66, 0.95, oAm));
            oShell *= 0.86 + 0.28 * oG3.g;
            // mother-of-pearl: each piece its own tone (the map), the fine bands of its growth, and a colour that turns with the eye
            float oTone = clamp(oB.g * 1.5 - 0.3, 0.0, 1.0), oFig = mix(oG2.g, oG3.g, step(0.5, oG1.g)) - 0.5;
            vec3 oPearl = mix(vec3(0.15, 0.16, 0.18), vec3(0.47, 0.465, 0.45), oTone * oTone * (3.0 - 2.0 * oTone)) * (1.0 + oFig * 0.3);
            // nacre: each piece is cut at its own angle, so each has its own moment. As the eye moves, a silky band of light crosses a piece
            // and its colour runs through rose, green and pale blue — soft pastel, never a rainbow; the neighbour turns at another moment.
            { vec3 oG0 = texture2D(uGrain, vMapUv * 2.6 + 0.11).rgb; float a = oG0.r * 9.0 + oG1.r * 2.0; vec3 gd = normalize(vec3(cos(a), 0.35, sin(a))); float t = dot(normalize(vObjView), gd);
              float ph = t * 3.2 + oG0.r * 1.3 + oG1.r * 0.4 + oB.g * 0.35 + oFig * 0.25;
              vec3 hue = 0.5 + 0.5 * cos(6.2832 * (ph + vec3(0.0, 0.33, 0.67)));
              float band = pow(0.5 + 0.5 * cos(6.2832 * (ph * 0.5 + 0.2 + oG3.g * 0.06)), 2.5), deep = 0.5 + 0.5 * cos(6.2832 * (ph * 0.5 + 0.7));
              vec3 pastel = mix(vec3(1.0), 0.24 + 1.52 * hue, 0.46 + 0.2 * deep);
              float nk = 1.0 - 0.65 * oFar;   // (from afar a piece is a pixel or two: its play of colour is calmed there, or the board would twinkle)
              oPearl = oPearl * mix(0.95, 0.5 + 0.9 * band, nk) * mix(vec3(1.0), pastel, nk) + hue * band * 0.04 * nk; }
            // bone: the lipping (chess side) and the strips over the hinges (backgammon side) — cream, a little streaked, yellowed in the joints
            vec2 oQ = abs(vMapUv - 0.5) * vec2(${W.toFixed(2)}, ${D.toFixed(2)});
            float oBone = uMode > 0.5 ? smoothstep(0.35, 0.65, oB.r) : step(oQ.x, 0.46) * step(abs(oQ.y - ${(D / 2 - 2.95).toFixed(2)}), 2.75);
            vec3 oBoneC = vec3(0.62, 0.52, 0.36) * (0.88 + 0.2 * oG3.g) * (0.9 + 0.2 * oG1.r);
            oPearl = mix(oPearl, oBoneC, oBone);
            float oEdge = mix(smoothstep(0.5, 0.66, oA.r), 1.0, oFar);                                                           // the dark joint round every piece
            oPearl *= mix(0.32, 1.0, oEdge) * (1.0 - 0.72 * oB.b);
            float oGr = uMode > 0.5 ? 0.0 : smoothstep(0.3, 0.6, oB.r) * (1.0 - oP);
            vec3 oCol = mix(oShell, vec3(0.36, 0.33, 0.27) * (0.85 + 0.3 * oG2.b), oL * 0.9);
            oCol = mix(oCol, vec3(0.055, 0.105, 0.085) * (0.8 + 0.4 * oG2.b), oGr);
            oCol = mix(oCol, oPearl, oP);
            if (uMode < 0.5) { vec2 q = vec2(min(oQ.x - ${GAP.toFixed(2)}, ${(W / 2).toFixed(2)} - oQ.x), ${(D / 2).toFixed(2)} - oQ.y), e = q - ${IN2.toFixed(2)};   // how far inside the field (cm)
              float ao = min(e.x, e.y); if (ao > -0.05) oCol *= 0.55 + 0.45 * smoothstep(-0.05, 0.9, ao); else oCol *= 0.8 + 0.2 * smoothstep(${(IN2 - IN1 - .2).toFixed(2)}, 0.0, -ao - 0.05); }
            diffuseColor.rgb = oCol;`)
            .replace('#include <roughnessmap_fragment>', `float roughnessFactor = mix(mix(0.34, 0.4, oAm * 0.5), mix(0.24, 0.5, oBone), oP) + oL * 0.15 + oB.b * 0.3 + (oG2.b - 0.5) * 0.1;`)
            .replace('#include <metalnessmap_fragment>', `float metalnessFactor = (1.0 - oP) * (1.0 - oL) * smoothstep(0.3, 1.0, oAm) * 0.2;`)
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            { vec2 dx = dFdx(vMapUv), dy = dFdy(vMapUv); float fp = oFp;
              // (seen from afar the footprint covers many texels: the bump fades out there, so nothing shimmers)
              float k = 2.2 * (1.0 - smoothstep(1.2, 3.5, fp));
              if (k > 0.0) { float h0 = ottH(vMapUv); normal = ottPerturb(-vViewPosition, normal, vec2(ottH(vMapUv + dx) - h0, ottH(vMapUv + dy) - h0) * k, faceDirection); } }`); };
        m.customProgramCacheKey = () => 'ott-inlay2'; return m; };
      const bgMat = face('bg', 0), chMat = face('ch', 1);
      const wood = K.mat({ color: '#1c0d08', roughness: .55 });
      // the stringing on the leaves' edges: three light lines in dark wood (V&A 2012FT9876)
      const lineT = K.tex(64, 64, (g, w, h) => { const n = K.noise(7); g.fillStyle = '#1a0c07'; g.fillRect(0, 0, w, h); [[.2, .1], [.42, .1], [.64, .1]].forEach(([y, t]) => { g.fillStyle = '#b9ab8c'; g.fillRect(0, y * h, w, t * h); });
        const img = g.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) { const k = .86 + n((i / 4 % w) / 5, (i / 4 / w | 0) / 9, 2) * .28; d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } g.putImageData(img, 0, 0); }, { rep: [1, 1] });
      lineT.wrapS = TT.RepeatWrapping;
      const lineMat = K.mat({ map: lineT, color: '#ffffff', roughness: .45 });
      const horn = K.mat({ color: '#0d0907', roughness: .35, clearcoat: .5, clearcoatRoughness: .3 });
      /* ---------- geometry: quads gathered by material ---------- */
      const bufs = new Map();
      const buf = m => { let b = bufs.get(m); if (!b) bufs.set(m, b = { p: [], n: [], u: [] }); return b; };
      // a quad a-b-c-d (counter-clockwise seen from outside); uv per corner; normals per corner (or the face's own)
      // (out: a direction the face must look towards — the corners are put in the right order for it)
      const quad = (m, P, U, Nn, out) => { const b = buf(m), A = new TT.Vector3(...P[0]), B = new TT.Vector3(...P[1]), C = new TT.Vector3(...P[2]);
        const fv = B.clone().sub(A).cross(C.clone().sub(A)).normalize(), rev = out && fv.dot(new TT.Vector3(...out)) < 0, fn = (rev ? fv.negate() : fv).toArray();
        (rev ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]).forEach(i => { b.p.push(...P[i]); b.n.push(...(Nn ? Nn[i] : fn)); b.u.push(...(U ? U[i] : [0, 0])); }); };
      const uvBG = (x, z) => [(x + W / 2) / W, 1 - (z + D / 2) / D], uvCH = (x, z) => [1 - (x + W / 2) / W, 1 - (z + D / 2) / D];
      [-1, 1].forEach(sd => {   // the two leaves, left and right of the hinge (x = 0)
        // a leaf's plan: xa = its outer edge, xb = its hinge edge; rings inset by s from all four edges
        const xa = sd * W / 2, xb = sd * GAP, z0 = -D / 2, z1 = D / 2;
        const ring = s => [[xa - sd * s, z0 + s], [xb + sd * s, z0 + s], [xb + sd * s, z1 - s], [xa - sd * s, z1 - s]];   // far-outer, far-hinge, near-hinge, near-outer
        const top = (m, uv, R, y, flipW) => { const P = R.map(([x, z]) => [x, y, z]), U = R.map(([x, z]) => uv(x, z)); quad(m, P, U, null, [0, flipW ? -1 : 1, 0]); };
        // a band between two rings at two heights (four mitred trapezoids)
        const band = (m, uv, Ra, ya, Rb, yb) => { for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4, P = [[Ra[k][0], ya, Ra[k][1]], [Ra[k2][0], ya, Ra[k2][1]], [Rb[k2][0], yb, Rb[k2][1]], [Rb[k][0], yb, Rb[k][1]]], U = [uv(...Ra[k]), uv(...Ra[k2]), uv(...Rb[k2]), uv(...Rb[k])];
          quad(m, P, U, null, [0, 1, 0]); } };
        const CH = .05, R0 = ring(CH), R1 = ring(IN1 - CH), R1b = ring(IN1), Rm = ring(IN1 + .1), R2 = ring(IN2);
        band(bgMat, uvBG, R0, YT, R1, YT); band(bgMat, uvBG, R1, YT, R1b, YT - CH); { const Ro = ring(0); band(bgMat, uvBG, [Ro[0], Ro[1], Ro[2], Ro[3]], YT - CH, R0, YT); }                      // the fillets' tops
        band(bgMat, uvBG, R1b, YT - CH, Rm, YT - .2);                 // the moulding: a steep little step, then the slope down to the field
        band(bgMat, uvBG, Rm, YT - .2, R2, YF);
        top(bgMat, uvBG, R2, YF);                               // the playing field
        // the chess face (underneath), inside the lipping
        const Rc = [[xa - sd * LIPW, z0 + LIPW], [xb, z0 + LIPW], [xb, z1 - LIPW], [xa - sd * LIPW, z1 - LIPW]];
        top(chMat, uvCH, Rc, 0, true);
        // the hinge-side wall (plain wood, in the slit)
        quad(wood, [[xb, 0, z0], [xb, 0, z1], [xb, YT, z1], [xb, YT, z0]], null, null, [-sd, 0, 0]);
        // the three outer edges: lipping (quarter round, bone), then the wall with its stringing and its row of plaques
        const NL = 8, edges = [   // each: a point on the edge's start and end, the outward normal, and which way the mitre cuts
          { a: [xa, z0], b: [xa, z1], n: [sd, 0], ca: [-sd, 1], cb: [-sd, -1] },       // outer side
          { a: [xb, z0], b: [xa, z0], n: [0, -1], ca: [0, 0], cb: [-sd, 1] },          // far
          { a: [xa, z1], b: [xb, z1], n: [0, 1], ca: [-sd, -1], cb: [0, 0] },          // near
        ];
        edges.forEach(e => {
          const at = (end, s) => { const p = end ? e.b : e.a, c = end ? e.cb : e.ca; return [p[0] + c[0] * s, p[1] + c[1] * s]; };   // the edge's end, drawn in by s along the mitre
          // the lipping: from the chess face (inset LIPW, y = 0) round to the wall (inset 0, y = LIPH); its picture is the photographed strip, spread over the arc
          for (let k = 0; k < NL; k++) { const t0 = k / NL * Math.PI / 2, t1 = (k + 1) / NL * Math.PI / 2;
            const s0 = LIPW * (1 - Math.sin(t0)), s1 = LIPW * (1 - Math.sin(t1)), y0 = LIPH * (1 - Math.cos(t0)), y1 = LIPH * (1 - Math.cos(t1)), d0 = LIPW * (1 - k / NL), d1 = LIPW * (1 - (k + 1) / NL);
            const nr = t => { const nx = Math.sin(t) / LIPW, ny = -Math.cos(t) / LIPH, l = Math.hypot(nx, ny); return [e.n[0] * nx / l, ny / l, e.n[1] * nx / l]; };
            const A0 = at(0, s0), B0 = at(1, s0), A1 = at(0, s1), B1 = at(1, s1), uA0 = at(0, d0), uB0 = at(1, d0), uA1 = at(0, d1), uB1 = at(1, d1);
            quad(chMat, [[A0[0], y0, A0[1]], [B0[0], y0, B0[1]], [B1[0], y1, B1[1]], [A1[0], y1, A1[1]]], [uvCH(...uA0), uvCH(...uB0), uvCH(...uB1), uvCH(...uA1)], [nr(t0), nr(t0), nr(t1), nr(t1)], nr((t0 + t1) / 2)); }
          // the wall above the lipping, in three bands; its picture is the fillet top beside it (d = how far in from the edge the picture is read)
          const uA = at(0, 0), uB = at(1, 0), U = d => [uvBG(uA[0] - e.n[0] * d, uA[1] - e.n[1] * d), uvBG(uB[0] - e.n[0] * d, uB[1] - e.n[1] * d)], len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
          const wall = (m, ya, yb, Uq) => quad(m, [[e.a[0], ya, e.a[1]], [e.b[0], ya, e.b[1]], [e.b[0], yb, e.b[1]], [e.a[0], yb, e.a[1]]], Uq, null, [e.n[0], 0, e.n[1]]);
          wall(lineMat, LIPH, LIPH + .32, [[0, 0], [len / 4, 0], [len / 4, 1], [0, 1]]);                       // stringing above the lipping
          wall(bgMat, LIPH + .32, YT - .3, [U(1.17)[0], U(1.17)[1], U(.02)[1], U(.02)[0]]);                   // the row of plaques
          wall(lineMat, YT - .3, YT - CH, [[0, 1], [len / 4, 1], [len / 4, 0], [0, 0]]);                       // stringing under the fillet
        });
      });
      bufs.forEach((b, m) => { const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(b.u, 2));
        const me = new TT.Mesh(g, m); me.castShadow = me.receiveShadow = true; G.add(me); });
      // the hinge pins: a dark domed head over the slit, near each end (their place from the photograph; height estimated)
      [-1, 1].forEach(s => { const p = new TT.Mesh(new TT.SphereGeometry(.34, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), horn); p.scale.y = .55; p.position.set(0, YT, s * (D / 2 - 3.72)); p.castShadow = true; G.add(p); });
      G.userData.dispose = () => owned.forEach(t => t.dispose());   // (the pictures are uniforms, not the material's own textures: the case cannot find them itself)
      for (const k in IMG) delete IMG[k];   // (the decoded pictures are large: let go of them — ready() fetches them again from the browser's cache)
      return G;
    },
  };
})();
