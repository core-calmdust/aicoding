/* Piece sets for tools/art.html: each piece is a signed distance field seen straight from above (x right, y down, z towards the
   viewer; the piece fits in -1..1), ray-marched and lit like the boards. Key: '<set>-f' (the fox) / '<set>-g' (a goose).
   The cute set is drawn in SVG (texture) and only composited. */
(function () {
  const COMMON = `
struct PMat { vec3 alb; float spec; float gloss; float metal; vec3 emit; };
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float sdEll(vec3 p, vec3 r){ float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float sdRBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 FX(vec3 p){ return (p - vec3(0., .1, 0.)) / 1.04; }
// the fox's head, looking up at the viewer: a round skull, two ears, a muzzle with the nose towards the viewer
float foxHead(vec3 p){
  float d = sdEll(p - vec3(0., -.06, -.1), vec3(.56, .5, .44));                  // the skull
  vec3 c = p; c.x = abs(c.x); c -= vec3(.4, .14, -.08); c.xy = rot(.5) * c.xy;    // cheek ruffs, swept out and down to a point
  c.y *= 1. + max(c.x, 0.) * 1.4;
  d = smin(d, sdEll(c, vec3(.36, .17, .2)), .12);
  vec3 q = p; q.x = abs(q.x); q -= vec3(.36, -.6, -.02); q.xy = rot(-.36) * q.xy;  // tall pointed ears
  q.x *= 1. + clamp(-q.y, 0., 1.) * 2.2;
  d = smin(d, sdEll(q, vec3(.22, .44, .1)), .08);
  vec3 m = p - vec3(0., .3, .26); m.x *= 1. + max(m.y, 0.) * 1.6;                  // a narrow muzzle to the chin
  d = smin(d, sdEll(m, vec3(.21, .3, .22)), .12);
  return d;
}
// 2D marks on the fox's face (screen position): eyes, nose, ear insides
float foxEye(vec2 q){ q.x = abs(q.x); q -= vec2(.22, -.02); q = rot(-.42) * q; return length(q / vec2(.1, .05)) - 1.; }
float foxNose(vec3 p){ return length((p.xy - vec2(0., .52)) / vec2(.075, .055)) - 1.; }
float earIn(vec2 q){ q.x = abs(q.x); q -= vec2(.37, -.58); q = rot(-.36) * q; q.x *= 1. + clamp(-q.y, 0., 1.) * 2.2; return length(q / vec2(.11, .28)) - 1.; }
`;
  const TEMPLATE = `
float calcAO(vec3 p, vec3 n){ float o = 0., w = 1.; for (int i = 1; i <= 5; i++){ float h = .02 + .06 * float(i); o += w * (h - map(p + n * h)); w *= .7; } return clamp(1. - 2.2 * o, .3, 1.); }
float shadow(vec3 p){ float t = .02, r = 1.; for (int i = 0; i < 40; i++){ float h = map(p + LDIR * t); r = min(r, 10. * h / t); t += clamp(h, .01, .1); if (r < .02 || t > 2.) break; } return clamp(r, 0., 1.); }
vec4 shadeAt(vec2 uv){
  vec2 xy = uv * 2. - 1.;
  vec3 p = vec3(xy, 2.); float t = 0.;
  bool hit = false;
  for (int i = 0; i < 160; i++){ float d = map(p); if (d < .0008){ hit = true; break; } p.z -= max(d, .001) * .8; if (p.z < -1.5) break; }
  if (!hit) return vec4(0.);
  vec2 e = vec2(.0015, 0.);
  vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
  PMat m = PMat(vec3(.5), .4, .5, 0., vec3(0.));
  mat(p, n, m);
  float ao = calcAO(p, n), sh = .45 + .55 * shadow(p + n * .01);
  vec3 c = litP(m, n, ao, sh, p);
  return vec4(c + m.emit, 1.);
}`;
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
  const P = {};
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
  // ---------------------------------------------------------------- wood: a beech ball for each goose; a cherry fox, its face burnt in
  P['wood-g'] = { glsl: WOOD3 + `
float map(vec3 p){ return length(p) - .9; }
void mat(vec3 p, vec3 n, inout PMat m){ m.alb = wood3(p, hexc(234., 206., 162.), hexc(204., 166., 116.), 9., 1.3); m.spec = .45; m.gloss = .42; }` };
  P['wood-f'] = { glsl: WOOD3 + `
float map(vec3 p){ return foxHead(FX(p)) * 1.04; }
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 q = FX(p);
  vec3 c = wood3(q, hexc(222., 104., 40.), hexc(170., 66., 22.), 6., 2.7);
  float burn = 0.;
  burn = max(burn, smoothstep(.15, -.15, foxEye(q.xy)));
  burn = max(burn, smoothstep(.2, -.2, foxNose(q)) * step(.4, q.z));
  burn = max(burn, smoothstep(.25, -.25, earIn(q.xy)) * .8);
  burn = max(burn, smoothstep(.02, .0, abs(q.x) - .006 * (1. - smoothstep(.4, .62, q.y))) * step(.56, q.y) * step(q.y, .66) * .9);
  c = mix(c, hexc(44., 20., 10.), burn * .92);
  c = mix(c, hexc(236., 196., 150.), smoothstep(.3, .0, length((q.xy - vec2(0., .44)) / vec2(.32, .2)) - .5) * .35 * (1. - burn));   // a paler muzzle (lighter wood)
  m.alb = c; m.spec = .5; m.gloss = .48;
}` };
  // ---------------------------------------------------------------- bauhaus: painted wooden blocks (geese: orange squares, the fox: a teal diamond)
  P['bauhaus-g'] = { glsl: `
float map(vec3 p){ return sdRBox(p - vec3(0., 0., -.2), vec3(.74, .74, .5), .08); }
void mat(vec3 p, vec3 n, inout PMat m){ m.alb = hexc(236., 104., 42.) * (.97 + .04 * vn3(p * 40.)); m.spec = .3; m.gloss = .28; }` };
  P['bauhaus-f'] = { glsl: `
float map(vec3 p){ vec3 q = p; q.xy = rot(.785398) * q.xy; return sdRBox(q - vec3(0., 0., -.15), vec3(.66, .66, .58), .08); }
void mat(vec3 p, vec3 n, inout PMat m){ m.alb = hexc(24., 118., 124.) * (.97 + .04 * vn3(p * 40.)); m.spec = .3; m.gloss = .28; }` };
  // ---------------------------------------------------------------- lux: pearls for the geese, a solid gold fox with ruby eyes
  P['lux-g'] = { glsl: `
float map(vec3 p){ return length(p) - .9 + .004 * (vn3(p * 6.) - .5); }
void mat(vec3 p, vec3 n, inout PMat m){
  float g = 1. - n.z;
  vec3 c = mix(hexc(236., 228., 216.), hexc(232., 206., 212.), smoothstep(.1, .8, g));
  float ang = atan(n.y, n.x);
  c = mix(c, hexc(204., 226., 222.), smoothstep(.45, .95, g) * (.5 + .5 * sin(ang * 2. + 1.)) * .55);
  c = mix(c, hexc(240., 214., 190.), smoothstep(.4, .9, g) * (.5 + .5 * sin(ang * 3. - .7)) * .35);
  c *= .9 + .08 * vn3(p * 5.);
  m.alb = c * .82; m.spec = 1.6; m.gloss = .9;
  m.emit = hexc(255., 236., 236.) * .07 * smoothstep(.0, .7, n.z);   // the soft inner glow of nacre
}` };
  P['lux-f'] = { glsl: `
float eyeGem(vec3 p){ vec3 q = p; q.x = abs(q.x); return length((q - vec3(.22, -.02, .3)) / vec3(1., .6, 1.)) - .08; }
float map(vec3 p){ vec3 q = FX(p); return min(foxHead(q), eyeGem(q)) * 1.04; }
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 q = FX(p);
  if (eyeGem(q) < .004){ m.alb = hexc(170., 8., 28.); m.spec = 1.4; m.gloss = .95; m.emit = hexc(255., 40., 60.) * .45 * smoothstep(.2, 1., n.z); return; }
  vec3 gold = hexc(255., 204., 120.);
  // engraved fur: fine lines sweeping back from the muzzle
  float fur = smoothstep(.75, 1., abs(sin(atan(q.y - .45, q.x) * 26. + length(q.xy - vec2(0., .45)) * 8.))) * step(q.y, .2) * (1. - step(.0, -earIn(q.xy)));
  gold *= 1. - .25 * fur;
  if (foxNose(q) < 0. && q.z > .4) { m.alb = hexc(18., 16., 16.); m.spec = 1.; m.gloss = .9; return; }
  m.alb = mix(gold, gold * hexc(255., 200., 170.), smoothstep(.1, -.2, earIn(q.xy)) * .4); m.metal = 1.; m.spec = 1.; m.gloss = .86 - fur * .2;
}` };
  // ---------------------------------------------------------------- norse: bone pieces with ring-and-dot carving; a fox carved in amber
  P['norse-g'] = { glsl: `
float ringDot(vec2 q){   // ring-and-dot marks: one in the middle, six round it
  float d = abs(length(q) - .2); d = min(d, length(q) - .055);
  for (int i = 0; i < 6; i++){ float a = float(i) * PI / 3. + .3; vec2 c = vec2(cos(a), sin(a)) * .56; d = min(d, abs(length(q - c) - .11)); d = min(d, length(q - c) - .03); }
  return d;
}
float map(vec3 p){
  float d = sdEll(p, vec3(.9, .9, .62));
  d += .016 * smoothstep(.022, .006, ringDot(p.xy)) * step(.0, p.z);
  d += .006 * (vn3(p * 9.) - .5);
  return d;
}
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 c = mix(hexc(230., 218., 190.), hexc(206., 186., 146.), smoothstep(.3, .8, fbm3(p * 2.5)));
  c *= 1. - .18 * smoothstep(.75, .95, vn3(p * vec3(30., 4., 4.)));   // the grain of the bone
  float g = smoothstep(.026, .008, ringDot(p.xy));
  c = mix(c, hexc(92., 70., 46.), g * .85);
  c = mix(c, c * .82, smoothstep(.5, 1., length(p.xy)) * .5);
  m.alb = c; m.spec = .5; m.gloss = .4;
}` };
  P['norse-f'] = { glsl: `
float map(vec3 p){ return foxHead(FX(p)) * 1.04; }
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 q = FX(p);
  float burn = max(smoothstep(.15, -.15, foxEye(q.xy)), smoothstep(.2, -.2, foxNose(q)) * step(.4, q.z));
  float thick = pow(max(n.z, 0.), 1.4);                          // a crude thickness: the face is deep, the silhouette thin
  float through = .55 + .45 * (1. - max(dot(n, LDIR), 0.));      // light passes through to the far side
  float cloud = fbm3(q * 2.4 + 4.);
  vec3 deep = hexc(92., 26., 2.), honey = hexc(250., 158., 34.), pale = hexc(255., 214., 120.);
  vec3 c = mix(deep, honey, smoothstep(.05, .85, thick * through + (cloud - .5) * .35));
  c = mix(c, pale, smoothstep(.75, 1., thick * through + cloud * .2) * .6);
  c = mix(c, deep * .5, smoothstep(.2, -.2, earIn(q.xy)) * .4);
  m.alb = hexc(60., 20., 2.) * .3; m.spec = 1.3; m.gloss = .94;
  m.emit = mix(c * .62, hexc(30., 10., 2.), burn * .9);
}` };
  // ---------------------------------------------------------------- delft: glazed porcelain discs painted in cobalt
  const DELFT = `
float map(vec3 p){
  float r = length(p.xy);
  float top = .3 + .05 * (1. - r * r);
  vec2 d = vec2(r - .9, abs(p.z) - top);
  return min(max(d.x, d.y), 0.) + length(max(d + .14, 0.)) - .14;
}
float paintOf(vec3 p){
  vec4 tx = texture(tPc, p.xy * .5 + .5);
  float blur = textureLod(tPc, p.xy * .5 + .5, 3.).a;
  float pool = clamp((tx.a - blur) * 2., 0., 1.);
  return clamp(tx.a * (.55 + .45 * (1. - tx.r)) * (.7 + .3 * fbm(p.xy * 6.)) + pool * .4 * tx.a, 0., 1.);
}
void mat(vec3 p, vec3 n, inout PMat m){
  vec3 c = hexc(240., 243., 246.);
  float k = paintOf(p);
  c = mix(c, mix(hexc(126., 152., 206.), hexc(22., 46., 126.), smoothstep(.15, .95, k)), smoothstep(.02, .3, k));
  m.alb = c; m.spec = .9; m.gloss = .92;
}`;
  const delftPiece = (fox) => {
    const D = '#000', W = '#fff';
    const fx = `<path fill="${D}" d="M20,70C40,50 70,45 100,50C115,40 125,30 135,28L139,8L147,26L155,10L158,32C166,36 176,42 188,47C178,53 166,55 155,56C150,62 148,70 152,80L164,104L155,108L139,84C125,84 110,84 95,82L82,102L62,112L57,105L71,92C61,86 51,81 43,79C31,88 15,98 -6,94C2,82 9,72 20,70Z"/><circle cx="160" cy="40" r="3.2" fill="${W}"/><path d="M60,62C80,58 100,60 118,64" stroke="${W}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
    const gs = `<path fill="${D}" d="M30,120C30,95 60,85 95,88C120,90 140,100 152,112L166,102L156,124C142,142 110,152 80,150C50,148 30,138 30,120Z"/><path fill="${D}" d="M54,99C42,80 38,60 44,42C48,30 58,24 66,28C73,32 71,40 65,45C58,53 60,72 72,92Z"/><path fill="${D}" d="M46,33L20,40L46,43Z"/><circle cx="56" cy="34" r="2.6" fill="${W}"/><path d="M70,112C90,104 115,104 138,114" stroke="${W}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".85"/><path d="M82,148L80,172M100,148L102,172" stroke="${D}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    const art = fox
      ? `<circle cx="512" cy="512" r="430" fill="${W}" opacity=".55"/><circle cx="512" cy="512" r="440" fill="none" stroke="${D}" stroke-width="44"/><circle cx="512" cy="512" r="372" fill="none" stroke="${D}" stroke-width="10"/><g transform="translate(512,500) scale(3.1) translate(-92,-60)">${fx}</g>`
      : `<circle cx="512" cy="512" r="436" fill="none" stroke="${D}" stroke-width="18"/><circle cx="512" cy="512" r="396" fill="none" stroke="${D}" stroke-width="7"/><g transform="translate(512,520) scale(3.05) translate(-92,-100)">${gs}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${art}</svg>`;
  };
  P['delft-g'] = { glsl: DELFT, tex: { tPc: delftPiece(false) }, texSize: 1024 };
  P['delft-f'] = { glsl: DELFT, tex: { tPc: delftPiece(true) }, texSize: 1024 };
  // ---------------------------------------------------------------- cute: drawn characters (SVG), composited as they are
  const cuteFox = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="-100 -100 200 200"><defs>
    <radialGradient id="h" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#ffb066"/><stop offset=".6" stop-color="#f4852f"/><stop offset="1" stop-color="#d9601b"/></radialGradient>
    <radialGradient id="m" cx=".45" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f4e9dc"/></radialGradient></defs>
    <g stroke="#7a3510" stroke-width="5" stroke-linejoin="round">
      <path d="M-62,-30L-74,-88Q-70,-94 -62,-90L-18,-58Z" fill="url(#h)"/><path d="M62,-30L74,-88Q70,-94 62,-90L18,-58Z" fill="url(#h)"/>
      <path d="M0,-66C52,-66 84,-36 84,4C84,34 66,52 44,62C30,70 14,74 0,74C-14,74 -30,70 -44,62C-66,52 -84,34 -84,4C-84,-36 -52,-66 0,-66Z" fill="url(#h)"/>
    </g>
    <path d="M-61,-40L-68,-80L-36,-58Z" fill="#fff1e0"/><path d="M61,-40L68,-80L36,-58Z" fill="#fff1e0"/>
    <path d="M-80,14C-60,8 -36,14 -20,30C-10,40 -4,44 0,44C4,44 10,40 20,30C36,14 60,8 80,14C74,44 44,68 0,70C-44,68 -74,44 -80,14Z" fill="url(#m)"/>
    <path d="M0,-66C52,-66 84,-36 84,4C84,34 66,52 44,62C30,70 14,74 0,74C-14,74 -30,70 -44,62C-66,52 -84,34 -84,4C-84,-36 -52,-66 0,-66Z" fill="none" stroke="#7a3510" stroke-width="5"/>
    <ellipse cx="-50" cy="-30" rx="20" ry="10" fill="#fff" opacity=".35" transform="rotate(-25 -50 -30)"/>
    <g><ellipse cx="-30" cy="0" rx="12" ry="15" fill="#2a1a12"/><ellipse cx="30" cy="0" rx="12" ry="15" fill="#2a1a12"/>
      <circle cx="-26" cy="-6" r="5" fill="#fff"/><circle cx="34" cy="-6" r="5" fill="#fff"/><circle cx="-33" cy="6" r="2.2" fill="#fff" opacity=".8"/><circle cx="27" cy="6" r="2.2" fill="#fff" opacity=".8"/></g>
    <ellipse cx="-52" cy="22" rx="13" ry="8" fill="#ff8b8b" opacity=".55"/><ellipse cx="52" cy="22" rx="13" ry="8" fill="#ff8b8b" opacity=".55"/>
    <path d="M-8,26Q0,20 8,26Q4,34 0,34Q-4,34 -8,26Z" fill="#2a1a12"/>
    <path d="M-12,40Q-6,46 0,40Q6,46 12,40" stroke="#2a1a12" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  </svg>`;
  const cuteGoose = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="-100 -100 200 200"><defs>
    <radialGradient id="h" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f3f5f8"/><stop offset="1" stop-color="#d9dee8"/></radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc24a"/><stop offset="1" stop-color="#f08a1c"/></linearGradient></defs>
    <path d="M-6,-80Q2,-96 10,-84Q16,-96 22,-82" stroke="#6a7488" stroke-width="5" fill="#fff" stroke-linejoin="round" stroke-linecap="round"/>
    <circle r="80" cy="2" fill="url(#h)" stroke="#6a7488" stroke-width="5"/>
    <ellipse cx="-42" cy="-36" rx="20" ry="10" fill="#fff" opacity=".8" transform="rotate(-30 -42 -36)"/>
    <g><ellipse cx="-30" cy="-6" rx="10" ry="13" fill="#2a2a36"/><ellipse cx="30" cy="-6" rx="10" ry="13" fill="#2a2a36"/>
      <circle cx="-26" cy="-11" r="4.4" fill="#fff"/><circle cx="34" cy="-11" r="4.4" fill="#fff"/></g>
    <ellipse cx="-50" cy="20" rx="12" ry="7" fill="#ff9aa6" opacity=".55"/><ellipse cx="50" cy="20" rx="12" ry="7" fill="#ff9aa6" opacity=".55"/>
    <path d="M-24,14Q0,2 24,14Q22,32 0,40Q-22,32 -24,14Z" fill="url(#b)" stroke="#b5600e" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-18,20Q0,26 18,20" stroke="#b5600e" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="-8" cy="14" rx="6" ry="3" fill="#fff" opacity=".6"/>
  </svg>`;
  const SVGPC = `
vec4 shadeAt(vec2 uv){ vec4 t = texture(tPc, uv); return vec4(pow(t.rgb, vec3(2.2)), t.a); }`;
  P['cute-f'] = { raw: SVGPC, tex: { tPc: cuteFox }, texSize: 1024, aa: 2 };
  P['cute-g'] = { raw: SVGPC, tex: { tPc: cuteGoose }, texSize: 1024, aa: 2 };

  window.ART_PIECES = function (key) {
    const p = P[key];
    if (p.raw) return { glsl: p.raw, tex: p.tex, texSize: p.texSize, aa: p.aa };
    return { glsl: COMMON + LIT + p.glsl + TEMPLATE, tex: p.tex, texSize: p.texSize, aa: 3 };
  };
})();
