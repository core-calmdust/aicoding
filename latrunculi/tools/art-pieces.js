/* Counter sets for tools/art.html (Ludus Latrunculorum 2D art, 2026-11-18). Key: '<set>-<b|w|bx|wx>' — black (P1), white (P2), and the
   same counter turned over (incitus, blocked). Most sets are signed distance fields seen straight from above (the counter fits in
   -1..1); the busts are figures seen from the front-side on a round socle (ANCHOR in app.js: the board point is 80 % down the picture),
   and their blocked state is the bust toppled over. SVG art (engraving, relief, inlays) comes in as textures. */
(function () {
  const COMMON = `
struct PMat { vec3 alb; float spec; float gloss; float metal; vec3 emit; };
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdRCone(vec3 p, vec3 a, vec3 b, float r1, float r2){ vec3 ba = b - a, pa = p - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - mix(r1, r2, h); }
float sdCyl(vec3 p, float r, float h, float rr){ vec2 d = vec2(length(p.xy) - r + rr, abs(p.z) - h + rr); return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr; }
`;
  // ---------------------------------------------------------------- seen from above (x right, y down, z towards the viewer)
  const LIT = `
vec3 litP(PMat m, vec3 n, float ao, float sh, vec3 p){
  vec3 V = vec3(0., 0., 1.), H = normalize(LDIR + V);
  float dif = max(dot(n, LDIR), 0.) * sh * .9 + .28 * (.5 + .5 * n.z);
  vec3 R = reflect(-V, n);
  vec3 env = mix(studioBlur(R), studio(R), m.gloss);
  float fr = .04 + .96 * pow(1. - max(n.z, 0.), 5.);
  float shin = mix(8., 600., m.gloss * m.gloss);
  float sp = pow(max(dot(n, H), 0.), shin) * (shin + 8.) / 50. * sh;
  return m.alb * dif * ao * (1. - m.metal) + mix(vec3(m.spec * (fr + .02)), m.alb, m.metal) * (env * mix(.6, 1.1, m.gloss) + sp) * ao;
}`;
  const TOP = `
float calcAO(vec3 p, vec3 n){ float o = 0., w = 1.; for (int i = 1; i <= 5; i++){ float h = .02 + .06 * float(i); o += w * (h - map(p + n * h)); w *= .7; } return clamp(1. - 2.2 * o, .3, 1.); }
float shadow(vec3 p){ float t = .02, r = 1.; for (int i = 0; i < 40; i++){ float h = map(p + LDIR * t); r = min(r, 10. * h / t); t += clamp(h, .01, .1); if (r < .02 || t > 2.) break; } return clamp(r, 0., 1.); }
vec4 shadeAt(vec2 uv){
  vec2 xy = uv * 2. - 1.;
  vec3 p = vec3(xy, 2.); bool hit = false;
  for (int i = 0; i < 160; i++){ float d = map(p); if (d < .0008){ hit = true; break; } p.z -= max(d, .001) * .8; if (p.z < -1.5) break; }
  if (!hit) return vec4(0.);
  vec2 e = vec2(.0015, 0.);
  vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
  PMat m = PMat(vec3(.5), .4, .5, 0., vec3(0.));
  mat(p, n, m);
  float ao = calcAO(p, n), sh = .45 + .55 * shadow(p + n * .01);
  return vec4(litP(m, n, ao, sh, p) + m.emit, 1.);
}`;
  // relief / engraving from an SVG (alpha = amount); blurred a little so the relief has sloped walls
  const RELIEF = `
float rel(vec2 xy){ vec2 u = xy * .5 + .5; return texture(tPc, u).a * .55 + textureLod(tPc, u, 1.5).a * .3 + textureLod(tPc, u, 3.).a * .15; }`;
  const P = {};
  const svg = (inner, vb) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${vb || '0 0 1024 1024'}">${inner}</svg>`;
  const FONT = `font-family="TeX Gyre Pagella, Cardo, serif" font-weight="700" text-anchor="middle"`;
  // a laurel wreath: leaves in pairs along two arcs that meet at the bottom, ribbon-tied
  function wreath(cx, cy, R, n, leaf, fill) {
    let s = '';
    for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
      const a = (18 + i * (140 / (n - 1))) * Math.PI / 180;                 // from the bottom (0°) up the side towards the top
      const x = cx + side * R * Math.sin(a), y = cy + R * Math.cos(a);
      const tang = Math.atan2(-Math.sin(a), side * Math.cos(a)) * 180 / Math.PI + 90;   // the leaves point up along the branch
      const sz = leaf * (1 - i / n * .35);
      for (const o of [-1, 1]) s += `<ellipse cx="0" cy="${(-sz * .55).toFixed(1)}" rx="${(sz * .27).toFixed(1)}" ry="${(sz * .6).toFixed(1)}" fill="${fill}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(tang + o * 34).toFixed(1)})"/>`;
    }
    const a0 = 14 * Math.PI / 180, a1 = 160 * Math.PI / 180;
    for (const side of [-1, 1]) s += `<path d="M${(cx + side * R * Math.sin(a0)).toFixed(1)},${(cy + R * Math.cos(a0)).toFixed(1)}A${R},${R} 0 0 ${side > 0 ? 0 : 1} ${(cx + side * R * Math.sin(a1)).toFixed(1)},${(cy + R * Math.cos(a1)).toFixed(1)}" fill="none" stroke="${fill}" stroke-width="${(leaf * .1).toFixed(1)}"/>`;
    s += `<ellipse cx="${cx}" cy="${cy + R}" rx="${(leaf * .32).toFixed(1)}" ry="${(leaf * .16).toFixed(1)}" fill="${fill}"/>`;
    return s;
  }


  // ================================================================ busts (stone set): a Roman soldier's bust in a crested helmet on a round
  // socle — white marble and black basalt. Seen from the front-side, a little from above; turned over = the bust lies toppled on the board.
  const BUST = `
const float ELEV = .3;
const float WS = .76;
const vec3 CEN = vec3(0., 0., .6);
const float TURN = -.6;            // the bust looks to the viewer's right (three-quarter view)
float bust(vec3 p){
  p.xy = rot(TURN) * p.xy;
  // the socle: a broad round foot and a moulding
  float d = sdCyl(p - vec3(0., 0., .04), .3, .04, .016);
  d = min(d, sdCyl(p - vec3(0., 0., .1), .27, .025, .012));
  // the torso in armour, full down to the socle: a cuirass with a moulded chest, shoulder guards, a row of leather strips (pteruges)
  vec3 c = p - vec3(0., .0, .37);
  float w = .25 + .05 * clamp((c.z + .1) / .3, 0., 1.);
  float ch = sdRBox(c, vec3(w, .15, .22), .1);
  ch = smin(ch, sdEll(vec3(abs(p.x), p.y, p.z) - vec3(.24, .0, .58), vec3(.14, .15, .1)), .07);      // shoulders
  ch = smin(ch, sdEll(vec3(abs(p.x) - .095, p.y + .115, p.z - .5), vec3(.105, .05, .085)), .05);     // the moulded chest of the cuirass
  ch = smax(ch, p.z - .66 - .2 * (p.x * p.x), .04);
  float pad = sdEll(vec3(abs(p.x), p.y, p.z) - vec3(.29, .0, .55), vec3(.11, .155, .07));                 // shoulder guards (lames)
  pad = smin(pad, sdEll(vec3(abs(p.x), p.y, p.z) - vec3(.3, .0, .49), vec3(.1, .15, .055)), .012);
  ch = smin(ch, pad, .05);
  float belt = sdRBox(p - vec3(0., 0., .24), vec3(w + .02, .17, .02), .02);
  ch = min(ch, belt);
  float ang = atan(p.y, p.x), strip = abs(fract(ang * 14. / 6.2832) - .5);
  float ptr = sdRBox(p - vec3(0., 0., .17), vec3(w + .025, .175, .05), .03) + .008 * smoothstep(.1, .45, strip);
  ch = min(ch, ptr);
  d = smin(d, ch, .02);
  // the neck and the head
  d = smin(d, sdRCone(p, vec3(0., 0., .6), vec3(0., -.01, .78), .1, .088), .05);
  float hd = sdEll(p - vec3(0., -.01, .9), vec3(.135, .155, .165));
  hd = smin(hd, sdEll(p - vec3(0., -.105, .79), vec3(.075, .055, .06)), .05);                 // chin and jaw
  hd = smin(hd, sdRCone(p, vec3(0., -.155, .9), vec3(0., -.185, .84), .026, .02), .018);     // the nose
  hd = smin(hd, sdEll(p - vec3(0., -.125, .925), vec3(.1, .035, .022)), .03);                 // the brow
  vec3 ey = vec3(abs(p.x) - .052, p.y + .135, p.z - .895); hd = smax(hd, -(length(ey / vec3(.032, .03, .018)) - 1.) * .02, .01);   // eye sockets
  hd = smax(hd, -(length((p - vec3(0., -.15, .805)) / vec3(.04, .03, .006)) - 1.) * .006, .004);                                   // the mouth
  d = smin(d, hd, .03);
  // the helmet (galea): a bowl above the brow, a band, a neck guard, cheek pieces, a tall crest
  float hb = sdEll(p - vec3(0., .01, .935), vec3(.155, .172, .17));
  hb = smax(hb, .95 - p.z + .55 * max(-p.y - .03, 0.), .015);
  float band = abs(length((p.xy - vec2(0., .01)) / vec2(.156, .173)) - 1.) * .16 - .007; band = max(band, abs(p.z - .97 - .45 * max(-p.y - .03, 0.)) - .016);
  hb = min(hb, band);
  hb = min(hb, sdEll(p - vec3(0., .15, .9), vec3(.16, .1, .022)));                          // neck guard
  vec3 q = p; q.x = abs(q.x); q -= vec3(.128, -.05, .88); q.xy = rot(-.35) * q.xy; q.yz = rot(.2) * q.yz;
  hb = smin(hb, sdRBox(q, vec3(.006, .045, .05), .006), .01);                                          // cheek pieces
  float cr = sdEll(p - vec3(0., .01, 1.13), vec3(.05, .25, .15));
  cr = smax(cr, 1.07 - p.z, .02);
  hb = smin(hb, cr, .015);
  return min(d, hb);
}
float crestK(vec3 p){ p.xy = rot(TURN) * p.xy; return smoothstep(1.09, 1.12, p.z) * step(abs(p.x), .07); }
`;
  const SIDE = `
vec3 nrm(vec3 p){ vec2 e = vec2(.0012, 0.); return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx))); }
float calcAO(vec3 p, vec3 n){ float o = 0., w = 1.; for (int i = 1; i <= 5; i++){ float h = .015 + .04 * float(i); o += w * (h - map(p + n * h)); w *= .7; } return clamp(1. - 2.4 * o, .3, 1.); }
const vec3 LW = normalize(vec3(-.55, -.5, .7));
float softSh(vec3 p){ float sh = 1., tt = .02; for (int i = 0; i < 56; i++){ float h = map(p + LW * tt); sh = min(sh, 9. * h / tt); tt += clamp(h, .01, .12); if (sh < .02 || tt > 3.) break; } return clamp(sh, 0., 1.); }
vec4 shadeAt(vec2 uv){
  vec2 s = uv * 2. - 1.;
  vec3 F = vec3(0., cos(ELEV), -sin(ELEV)), Rr = vec3(1., 0., 0.), U = vec3(0., sin(ELEV), cos(ELEV));
  vec3 o = CEN + (s.x * Rr - s.y * U) * WS - F * 3.;
  float t = 0.; bool hit = false; vec3 p;
  for (int i = 0; i < 220; i++){ p = o + F * t; float d = map(p); if (d < .0005){ hit = true; break; } t += d * .8; if (t > 7. || p.z < -.02) break; }
  if (!hit) {
    // the board under the figure: only its shadow (transparent elsewhere)
    float tg = o.z / sin(ELEV); vec3 g = o + F * tg;
    float sh = softSh(g + vec3(0., 0., .002));
    float occ = clamp(map(g) / .12, 0., 1.);
    float a = (1. - sh) * .5 + (1. - occ) * .35;
    a *= smoothstep(1.2, .5, length(g.xy)) * smoothstep(.75, .5, abs(g.x));   // fade out before the picture's edge
    return vec4(0., 0., 0., clamp(a, 0., .7));
  }
  vec3 n = nrm(p);
  PMat m = PMat(vec3(.5), .4, .5, 0., vec3(0.));
  mat(p, n, m);
  n = bendN(p, n);
  float ao = calcAO(p, n);
  float sh = softSh(p + n * .004);
  vec3 nc = vec3(dot(n, Rr), -dot(n, U), -dot(n, F));
  vec3 Lc = vec3(dot(LW, Rr), -dot(LW, U), -dot(LW, F));
  vec3 V = vec3(0., 0., 1.), H = normalize(Lc + V);
  float dif = max(dot(nc, Lc), 0.) * (.3 + .7 * sh) * .95 + .3 * (.5 + .5 * nc.z) + .12 * max(-nc.x, 0.);
  vec3 R = reflect(-V, nc);
  vec3 env = mix(studioBlur(R), studio(R), m.gloss);
  float fr = .04 + .96 * pow(1. - max(nc.z, 0.), 5.);
  float shin = mix(8., 600., m.gloss * m.gloss);
  float sp = pow(max(dot(nc, H), 0.), shin) * (shin + 8.) / 50. * (.3 + .7 * sh);
  vec3 c = m.alb * dif * ao * (1. - m.metal) + mix(vec3(m.spec * (fr + .02)), m.alb, m.metal) * (env * mix(.6, 1.1, m.gloss) + sp) * ao;
  return vec4(c + m.emit * ao, 1.);
}`;
  // standing, or toppled: the bust rolled onto its side (its back to the board, the head to the right), turned a little
  const UPRIGHT = `float map(vec3 p){ return bust(p); }`;
  const TOPPLED = `float map(vec3 p){
  vec3 q = p - vec3(-.55, -.02, .3);
  q.xy = rot(-.25) * q.xy;
  q = vec3(-q.z, q.y, q.x);                    // lie down: the bust's up (z) along the board's x
  q.yz = rot(-.5) * q.yz;                      // rolled a little towards the viewer
  return bust(q + vec3(0., 0., 0.));
}`;
  const BUSTMAT = (white) => `
vec3 bendN(vec3 p, vec3 n){ float k = crestK(p) ; vec3 g = vec3(vn3(p * vec3(6., 60., 6.)) - .5, 0., vn3(p * vec3(6., 60., 6.) + 4.) - .5); return normalize(n + g * k * .5 + (vec3(vn3(p * 40.), vn3(p * 40. + 3.), vn3(p * 40. + 7.)) - .5) * .03); }
void mat(vec3 p, vec3 n, inout PMat m){
  ${white
    ? `vec3 c = mix(hexc(246., 243., 236.), hexc(230., 226., 218.), smoothstep(.4, .8, fbm3(p * 3.)));
  c = mix(c, hexc(186., 182., 172.), (1. - smoothstep(.0, .02, abs(fbm3(p * 2.2 + 4.) - .5))) * .15);
  m.alb = c; m.spec = .35; m.gloss = .72; m.emit = c * .16;`
    : `vec3 c = mix(hexc(40., 40., 42.), hexc(58., 56., 54.), smoothstep(.4, .8, fbm3(p * 3.)));
  c = mix(c, hexc(70., 68., 66.), smoothstep(.75, .95, vn3(p * 70.)) * .4);
  m.alb = c; m.spec = .7; m.gloss = .8;`}
}`;
  for (const [k, w] of [['b', 0], ['w', 1]]) {
    P['bust-' + k] = { side: true, glsl: BUST + UPRIGHT + BUSTMAT(w) + SIDE };
    P['bust-' + k + 'x'] = { side: true, glsl: BUST + TOPPLED + BUSTMAT(w) + SIDE };
  }

  // ================================================================ wood: turned wooden discs with a laser-burnt picture — a legionary's helmet
  // on the face, a laurel wreath on the back; natural birch and walnut
  const WOOD3 = `
vec3 wood3(vec3 p, vec3 a, vec3 b, float f, float seed){
  vec3 q = p + vec3(seed, .3 * seed, 0.);
  q.xy = rot(.5) * q.xy;
  float r = length(q.yz + vec2(2.6, 1.4)) * f + .8 * fbm3(q * vec3(.8, 3., 3.) + seed);
  float t = fract(r); float late = smoothstep(.55, .9, t) * (1. - smoothstep(.93, 1., t));
  vec3 c = mix(a, b, late * .4 + .2 * fbm3(q * 2.));
  c *= .93 + .1 * vn3(q * vec3(2., 60., 60.));
  return c;
}`;
  const helmetSVG = (ink) => svg(`<g fill="${ink}" stroke="${ink}" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="512" cy="512" r="438" fill="none" stroke-width="16"/><circle cx="512" cy="512" r="404" fill="none" stroke-width="6"/>
    <path d="M300,590C296,420 410,318 548,316C690,314 776,410 772,560L772,600L300,600Z" fill-opacity=".22" stroke-width="16"/>
    <path d="M286,588L790,588L790,628L286,628Z" stroke-width="10"/>
    <path d="M300,610L222,690L250,716L344,640Z" fill-opacity=".22" stroke-width="14"/>
    <path d="M604,628L708,628L700,770Q656,812 612,772Z" fill-opacity=".22" stroke-width="14"/>
    <circle cx="656" cy="664" r="10"/><circle cx="660" cy="740" r="10"/>
    <path d="M524,316L530,262" stroke-width="22"/>
    <path d="M382,330C390,170 560,120 708,196C736,210 740,246 714,256C620,214 480,236 412,340Z" fill-opacity=".3" stroke-width="14"/>
    ${Array.from({ length: 14 }, (_, i) => { const t = i / 13, x0 = 404 + t * 292, y0 = 300 - Math.sin(t * Math.PI) * 60 + (t > .8 ? (t - .8) * 200 : 0), x1 = 400 + t * 300, y1 = 210 - Math.sin(t * Math.PI) * 54 + (t < .2 ? (.2 - t) * 260 : 0); return `<path d="M${x0.toFixed(0)},${y0.toFixed(0)}L${x1.toFixed(0)},${y1.toFixed(0)}" stroke-width="5" fill="none"/>`; }).join('')}
    <path d="M330,560C340,450 420,370 520,352" stroke-width="7" fill="none" stroke-opacity=".9"/>
  </g>`);
  const wreathSVG = (ink) => svg(`<circle cx="512" cy="512" r="438" fill="none" stroke="${ink}" stroke-width="16"/><circle cx="512" cy="512" r="404" fill="none" stroke="${ink}" stroke-width="6"/>${wreath(512, 500, 290, 9, 96, ink)}`);
  const WOODPC = (dark) => WOOD3 + RELIEF + `
float burnK(vec2 xy){ vec2 u = xy * .5 + .5; return clamp(texture(tPc, u).a * .7 + textureLod(tPc, u, 2.).a * .5, 0., 1.); }
float map(vec3 p){
  float r = length(p.xy);
  float d = sdCyl(p, .9, .2, .1);
  d -= .006 * (1. - r * r);
  d += .028 * burnK(p.xy) * step(.0, p.z) * (.8 + .4 * vn3(p * 30.));   // the burnt wood is eaten away a little
  return d;
}
void mat(vec3 p, vec3 n, inout PMat m){
  float r = length(p.xy);
  vec3 c = ${dark ? 'wood3(p, hexc(132., 82., 46.), hexc(82., 46., 22.), 6., 3.1)' : 'wood3(p, hexc(238., 214., 172.), hexc(214., 180., 130.), 4.5, 1.7)'};
  vec2 u = p.xy * .5 + .5;
  float k = texture(tPc, u).a, k1 = textureLod(tPc, u, 2.).a, k2 = textureLod(tPc, u, 4.).a, k3 = textureLod(tPc, u, 5.5).a;
  float nz = fbm3(p * 9.);
  // a scorched halo spreading into the wood, then the char itself: black, crazed, a little glossy
  c = mix(c, c * ${dark ? 'vec3(.55, .42, .32)' : 'vec3(.7, .46, .26)'}, clamp(k3 * 2.6 * (.6 + .8 * nz), 0., 1.) * .85);
  c = mix(c, ${dark ? 'hexc(86., 44., 18.)' : 'hexc(176., 104., 50.)'}, clamp(k2 * 2.2 * (.6 + .8 * nz), 0., 1.) * .7);
  c = mix(c, ${dark ? 'hexc(70., 36., 16.)' : 'hexc(150., 86., 40.)'}, smoothstep(.05, .5, k2) * .7);
  c = mix(c, ${dark ? 'hexc(40., 20., 10.)' : 'hexc(96., 50., 22.)'}, smoothstep(.15, .6, k1) * .85);
  float ch = smoothstep(.25, .7, k * (.75 + .5 * nz));
  vec3 charC = mix(hexc(16., 10., 8.), hexc(52., 30., 16.), fbm3(p * 14.)) * (.85 + .3 * fbm3(p * 40.));
  c = mix(c, charC, ch);
  // the rim toasted from the turning and the burning
  c = mix(c, c * vec3(.55, .4, .28), smoothstep(.62, .92, r) * .55);
  m.alb = c; m.spec = .3 + ch * .25; m.gloss = .3 + ch * .15;
}`;
  P['wood-b'] = { glsl: WOODPC(1), tex: { tPc: helmetSVG('#000') }, texSize: 1024 };
  P['wood-w'] = { glsl: WOODPC(0), tex: { tPc: helmetSVG('#000') }, texSize: 1024 };
  P['wood-bx'] = { glsl: WOODPC(1), tex: { tPc: wreathSVG('#000') }, texSize: 1024 };
  P['wood-wx'] = { glsl: WOODPC(0), tex: { tPc: wreathSVG('#000') }, texSize: 1024 };

  // ================================================================ abstract: flat matte tokens with an inlaid arch — charcoal with a terracotta
  // arch, bone-white with a charcoal arch; turned over = only the ring is left
  const ABS = (dark, ring) => `
float sdArch2(vec2 p){ float r = .26; vec2 q = p - vec2(0., .1); float box = max(abs(q.x) - r, abs(q.y - .02) - .2); float top = length(q - vec2(0., -.18)) - r; return min(box, max(top, q.y + .13)); }
float map(vec3 p){
  float d = sdCyl(p, .88, .17, .1);
  ${ring ? 'd = smax(d, -(length(p.xy) - .5), .06);' : ''}
  return d;
}
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 base = ${dark ? 'hexc(46., 44., 44.)' : 'hexc(238., 230., 214.)'}, ink = ${dark ? 'hexc(206., 112., 80.)' : 'hexc(46., 44., 44.)'};
  vec3 c = base * (.96 + .06 * vn3(p * 60.));
  ${ring ? '' : 'c = mix(c, ink, smoothstep(.006, -.006, sdArch2(p.xy)) * step(.1, p.z));'}
  m.alb = c; m.spec = .18; m.gloss = .16;
}`;
  P['abstract-b'] = { glsl: ABS(1, 0) }; P['abstract-w'] = { glsl: ABS(0, 0) };
  P['abstract-bx'] = { glsl: ABS(1, 1) }; P['abstract-wx'] = { glsl: ABS(0, 1) };

  // ================================================================ coins: a gold aureus and a silver denarius — SPQR in a laurel wreath on the
  // face; turned over, the plainer reverse with S·C (senatus consulto)
  const coinFace = svg(`${wreath(512, 500, 300, 10, 84, '#000')}<text x="512" y="578" ${FONT} font-size="168" letter-spacing="4" fill="#000">SPQR</text>`);
  const coinBack = svg(`<text x="512" y="612" ${FONT} font-size="330" fill="#000">S·C</text><path d="M330,680H694" stroke="#000" stroke-width="18"/>`);
  const COIN = (gold, back) => RELIEF + `
float map(vec3 p){
  float r = length(p.xy);
  float d = sdCyl(p, .9, .13, .05);
  float rim = smoothstep(.79, .82, r) * (1. - smoothstep(.88, .9, r));
  float ba = (floor(atan(p.y, p.x) / 6.2832 * 64.) + .5) * 6.2832 / 64.; float bead = smoothstep(.026, .016, length(p.xy - .745 * vec2(cos(ba), sin(ba))));
  d -= .028 * rim + .02 * bead;
  d -= .034 * rel(p.xy) * step(.0, p.z);
  return d;
}
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 c = ${gold ? 'hexc(255., 204., 112.)' : 'hexc(226., 230., 236.)'};
  float wear = textureLod(tPc, p.xy * .5 + .5, 2.).a;
  c *= .9 + .12 * fbm3(p * 6.);
  c = mix(c, c * ${gold ? 'vec3(.78, .62, .4)' : 'vec3(.62, .64, .66)'}, smoothstep(.1, .6, textureLod(tPc, p.xy * .5 + .5, 4.).a - wear * .6) * .7);   // toning in the hollows
  m.alb = c; m.metal = 1.; m.spec = 1.; m.gloss = ${back ? '.62' : '.86'} + .1 * wear;
}`;
  P['coin-b'] = { glsl: COIN(1, 0), tex: { tPc: coinFace }, texSize: 1024 };
  P['coin-w'] = { glsl: COIN(0, 0), tex: { tPc: coinFace }, texSize: 1024 };
  P['coin-bx'] = { glsl: COIN(1, 1), tex: { tPc: coinBack }, texSize: 1024 };
  P['coin-wx'] = { glsl: COIN(0, 1), tex: { tPc: coinBack }, texSize: 1024 };

  // ================================================================ glass: Roman glass gaming counters (the "glass soldiers" of the Laus Pisonis) —
  // a dark cobalt-black dome and an opaque white one; turned over, the flat underside with the rough pontil mark
  const GLASS = (dark, under) => `
// Roman glass counters as they come out of the ground: hand-pressed, a little irregular, a few seed bubbles, patches of the rainbow
// weathering crust; the dark one deep cobalt that glows where light passes through it, the light one opaque milk glass
vec3 irid(float t){ return .5 + .5 * cos(6.2832 * (t + vec3(0., .33, .67))); }
float shapeR(vec3 p){ float a = atan(p.y, p.x); return 1. + .014 * sin(a * 3. + 1.) + .01 * sin(a * 5. + 2.); }
float map(vec3 p){
  ${under
    ? `float r = length(p.xy) / shapeR(p);
  float d = sdCyl(vec3(p.xy / shapeR(p), p.z), .86, .1, .09) - .03;
  d += .004 * (vn3(p * 9.) - .5) + .003 * sin(r * 34. + vn3(p * 3.) * 5.) * smoothstep(.2, .6, r);
  d += .03 * smoothstep(.22, .1, r) * (fbm3(p * 22.) - .25);   // the rough pontil scar
  return d;`
    : `vec3 q = vec3(p.xy / shapeR(p), p.z);
  float d = sdEll(q - vec3(.02, -.01, -.14), vec3(.86, .86, .58));
  d = max(d, -p.z - .12);
  return d + .005 * (vn3(p * 4.) - .5);`}
}
void mat(vec3 p, vec3 n, inout PMat m){
  float r = length(p.xy);
  float crust = smoothstep(.55, .8, fbm3(p * 3.5 + 7.)) * (.4 + .6 * smoothstep(.3, .9, r));
  vec3 ir = irid(fbm3(p * 7.) * 1.6 + n.x * .4) * .6 + .25;
  float bub = smoothstep(.05, .02, cell2(p.xy * 9. + 3.)) * step(.82, h21(floor(p.xy * 9. + 3.)));
  ${dark
    ? `float thick = clamp(1. - r, 0., 1.);
  float through = clamp(dot(normalize(vec2(.6, .7)), p.xy) * .8 + .3, 0., 1.);       // light comes out on the far side from the lamp
  m.alb = hexc(6., 8., 22.); m.spec = 1.1; m.gloss = ${under ? '.5' : '.96'};
  m.emit = mix(hexc(10., 18., 70.), hexc(60., 110., 230.), through) * (.18 + .55 * through * (1. - thick * .6)) + hexc(120., 170., 255.) * bub * .25;`
    : `vec3 c = mix(hexc(242., 242., 238.), hexc(220., 228., 232.), smoothstep(.3, .8, fbm3(p * 2.2 + vec3(sin(r * 7.), 0., 0.))));
  m.alb = c; m.spec = .9; m.gloss = ${under ? '.45' : '.93'}; m.emit = c * .12;`}
  m.alb = mix(m.alb, ir * ${dark ? '.35' : '.8'}, crust * .55);
  m.gloss = mix(m.gloss, .35, crust);
  ${under ? 'm.alb *= 1. - .25 * smoothstep(.22, .1, r);' : ''}
}`;
  P['glass-b'] = { glsl: GLASS(1, 0) }; P['glass-w'] = { glsl: GLASS(0, 0) };
  P['glass-bx'] = { glsl: GLASS(1, 1) }; P['glass-wx'] = { glsl: GLASS(0, 1) };

  // ================================================================ bone: lathe-turned bone counters as found at Roman sites — a low dome with
  // turned rings and a centre dot; one set stained dark. Turned over: the flat back with a numeral scratched in (VI)
  const boneBack = svg(`<text x="512" y="660" ${FONT} font-size="380" fill="#000">VI</text>`);
  const BONE = (dark, back) => (back ? RELIEF : '') + `
// a V-groove cut by the lathe tool: depth and a hard edge
float vg(float r, float r0, float w){ return clamp(1. - abs(r - r0) / w, 0., 1.); }
float map(vec3 p){
  float r = length(p.xy);
  float d = sdCyl(p, .88, .12, .07);
  ${back
    ? 'd += .035 * rel(p.xy) * step(.0, p.z) * (.85 + .3 * vn3(p * 40.));'
    : `d -= .07 * (1. - r * r) * step(.0, p.z) * smoothstep(.9, .7, r);
  d += step(.0, p.z) * (.05 * vg(r, .36, .05) + .05 * vg(r, .64, .05) + .03 * vg(r, .5, .025));
  d += .07 * smoothstep(.07, .03, r);                                   // the centre point of the compass
  d += .0025 * sin(r * 260. + vn3(p * 6.) * 3.) * step(.0, p.z);          // lathe chatter`}
  return d * .9;
}
void mat(vec3 p, vec3 n, inout PMat m){
  float r = length(p.xy);
  vec3 c = ${dark ? 'mix(hexc(54., 36., 24.), hexc(96., 66., 42.), smoothstep(.3, .8, fbm3(p * 2.5)))' : 'mix(hexc(238., 226., 196.), hexc(212., 194., 154.), smoothstep(.3, .8, fbm3(p * 2.5)))'};
  c *= 1. - .14 * smoothstep(.76, .96, vn3(p * vec3(34., 4., 4.)));
  c *= 1. - .25 * smoothstep(.9, .98, vn3(p * vec3(60., 12., 12.) + 5.));
  ${back
    ? `float g = textureLod(tPc, p.xy * .5 + .5, 1.).a;
  c = mix(c, c * ${dark ? '.4' : 'vec3(.45, .36, .26)'}, smoothstep(.1, .7, g));`
    : `float g = max(max(vg(r, .36, .05), vg(r, .64, .05)), max(vg(r, .5, .025), smoothstep(.07, .03, r)));
  c = mix(c, c * ${dark ? '.45' : 'vec3(.55, .44, .3)'}, smoothstep(.2, .9, g));    // grime packed into the cuts`}
  m.alb = c; m.spec = .45; m.gloss = .5;
}`;
  P['bone-b'] = { glsl: BONE(1, 0) }; P['bone-w'] = { glsl: BONE(0, 0) };
  P['bone-bx'] = { glsl: BONE(1, 1), tex: { tPc: boneBack }, texSize: 1024 };
  P['bone-wx'] = { glsl: BONE(0, 1), tex: { tPc: boneBack }, texSize: 1024 };

  // ================================================================ helm (2026-11-19, user: the busts distract in 2D — more abstract): a carved
  // stone counter seen from above — a round base, the bowl of a helmet, the crest running front to back — white marble and black
  // basalt, softly polished; turned over = the flat underside of the base, chisel-dressed, with an incised ring
  // v2 (2026-11-19, user: seen too much from above it reads as nothing): a round stone counter with a helmet carved in relief —
  // the side view of a crested galea, raised from a slightly sunk field inside a rim; white marble and black basalt
  const helmRelief = svg(`<g fill="#000" stroke="#000" stroke-linejoin="round" stroke-linecap="round">
    <path d="M300,600C296,420 410,318 548,316C690,314 776,410 772,560L772,600Z" stroke-width="10"/>
    <path d="M286,588L792,588L792,632L286,632Z" stroke-width="8"/>
    <path d="M304,612L216,698L250,726L350,640Z" stroke-width="10"/>
    <path d="M600,630L712,630L704,776Q656,822 608,776Z" stroke-width="10"/>
    <path d="M512,318L520,262L540,262L548,318Z"/>
    <path d="M372,336C376,160 568,104 722,190C754,208 756,252 724,264C622,218 482,238 412,346Z" stroke-width="10"/>
  </g>`);
  const HELM = (dark, under) => RELIEF + `
float map(vec3 p){
  float r = length(p.xy);
  float d = sdCyl(p, .9, .15, .08);
  ${under
    ? `d += step(.0, p.z) * (.006 * (vn3(p * 18.) - .5) + .004 * (vn3(p * vec3(60., 6., 6.)) - .5) + .02 * smoothstep(.025, .0, abs(r - .5)));`
    : `d += step(.0, p.z) * (.018 * smoothstep(.72, .66, r) - .075 * rel(p.xy * 1.15) * smoothstep(.72, .66, r) + .004 * (vn3(p * 14.) - .5));`}
  return d;
}
void mat(vec3 p, vec3 n, inout PMat m){
  ${dark
    ? `vec3 c = mix(hexc(40., 40., 42.), hexc(58., 56., 56.), smoothstep(.3, .8, fbm3(p * 3.)));
  c *= .94 + .1 * vn3(p * 60.);
  m.alb = c; m.spec = .7; m.gloss = ${under ? '.25' : '.6'};`
    : `vec3 c = mix(hexc(240., 236., 228.), hexc(222., 216., 204.), smoothstep(.3, .8, fbm3(p * 2.6)));
  c = mix(c, hexc(186., 180., 168.), (1. - smoothstep(.0, .025, abs(fbm3(p * 2. + 4.) - .5))) * .15);
  m.alb = c; m.spec = .4; m.gloss = ${under ? '.22' : '.55'}; m.emit = c * .08;`}
  ${under ? 'm.alb = mix(m.alb, m.alb * .6, smoothstep(.03, .005, abs(length(p.xy) - .5)));' : 'float rr = length(p.xy), rv = smoothstep(.15, .5, rel(p.xy * 1.15)), fld = smoothstep(.72, .66, rr); m.alb *= mix(1., mix(' + (dark ? '.55' : '.8') + ', ' + (dark ? '1.45' : '1.08') + ', rv), fld); m.gloss = mix(m.gloss, m.gloss + .2, rv * fld);'}
}`;
  P['helm-b'] = { glsl: HELM(1, 0), tex: { tPc: helmRelief }, texSize: 1024 }; P['helm-w'] = { glsl: HELM(0, 0), tex: { tPc: helmRelief }, texSize: 1024 };
  P['helm-bx'] = { glsl: HELM(1, 1), tex: { tPc: helmRelief }, texSize: 1024 }; P['helm-wx'] = { glsl: HELM(0, 1), tex: { tPc: helmRelief }, texSize: 1024 };

  window.ART_PIECES = function (key) {
    const p = P[key];
    if (p.side) return { glsl: COMMON + p.glsl, aa: 3 };
    return { glsl: COMMON + LIT + p.glsl + TOP, tex: p.tex, texSize: p.texSize, aa: 3 };
  };
})();
