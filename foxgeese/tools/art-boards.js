/* Board and frame designs for tools/art.html. Each design gives GLSL for
     float H(vec2 p)  — height (cell units; p in cell units 0..7, y down)
     void M(vec2 p, inout Mat m) — the material at p
   and the shared template lights it (normal from H, a little occlusion, the studio light). Frames are seamless tiles (p 0..1). */
(function () {
  const TEMPLATE = (ao) => `
vec4 shadeAt(vec2 uv){
  vec2 p = uv * SCALE;
  float e = .0035 * SCALE / 7.;
  float h0 = H(p);
  float hx = H(p + vec2(e, 0.)) - H(p - vec2(e, 0.)), hy = H(p + vec2(0., e)) - H(p - vec2(0., e));
  vec3 n = normalize(vec3(-hx / (2. * e), -hy / (2. * e), 1.));
  float r = ${ao || '.05'} * SCALE / 7.;
  float avg = (H(p + vec2(r, 0.)) + H(p - vec2(r, 0.)) + H(p + vec2(0., r)) + H(p - vec2(0., r))) * .25;
  Mat m = Mat(vec3(.5), .3, .3, 0., clamp(1. - (avg - h0) * AOK, .35, 1.));
  M(p, m);
  vec3 c = lit(m.alb, n, m.spec, m.gloss, m.metal, m.ao);
  c = POST(p, c, m, n);
  c *= FINISH(uv);
  return vec4(c, 1.);
}`;
  // the light falls off a little towards the lower right, and the very edge of a board is rounded off
  const BOARD_FINISH = `vec3 FINISH(vec2 uv){ return vec3(1.06 - .12 * (uv.x * .45 + uv.y * .55)); }
float edgeRound(vec2 p, float w){ vec2 d = min(p, 7. - p); float k = min(d.x, d.y); return -w * .6 * pow(1. - clamp(k / w, 0., 1.), 2.); }`;
  const FRAME_FINISH = `vec3 FINISH(vec2 uv){ return vec3(1.); }`;

  // ---------------------------------------------------------------- wood (shared by the oak board and wooden frames)
  // flat-sawn planks: growth rings as cathedral arcs round a pith below the face, ring-porous pores, a few rays
  const WOOD = `
vec3 woodCol(vec2 q, float seed, vec3 early, vec3 lateC, float ringW, vec2 P, out float ringT){
  // q: x along the grain, y across (cell units); P: period for seamless tiles (0 = none)
  float y0 = (P.x > 0. ? .5 : .0) + (h21(vec2(seed, 3.)) - .5) * .8;
  float wob = P.x > 0. ? fbmP(vec2(q.x * .35 / P.x * P.x, seed), vec2(P.x * .35, 0.)) : fbm(vec2(q.x * .22 + seed * 7., seed));
  float dep = .9 + 2.2 * wob;
  float dy = q.y - y0 + .25 * (P.x > 0. ? fbmP(q * vec2(.5, 1.5) + seed, P * vec2(.5, 1.5)) : fbm(q * vec2(.35, 1.2) + seed * 3.)) ;
  float r = sqrt(dy * dy * 2.4 + dep * dep);
  float ring = r / ringW + .9 * (P.x > 0. ? fbmP(q * vec2(.8, 3.) + seed * 2., P * vec2(.8, 3.)) : fbm(q * vec2(.6, 2.6) + seed * 5.));
  float t = fract(ring); ringT = t;
  float late = smoothstep(.62, .9, t) * (1. - smoothstep(.97, 1., t));
  vec3 c = mix(early, lateC, late * .32 + smoothstep(.88, .985, t) * (1. - smoothstep(.985, 1., t)) * .3);
  c *= .94 + .1 * fbm(q * vec2(.25, .9) + seed * 4.);   // broad, quiet colour drift
  // fine streaks along the grain and pores (dense in the early wood of oak)
  float st = P.x > 0. ? vn(q * vec2(1.2, 70.) + seed, P * vec2(1.2, 70.)) : vn(q * vec2(1.4, 80.) + seed);
  c *= .93 + .12 * st;
  float pr = P.x > 0. ? vn(q * vec2(6., 140.) + seed * 9., P * vec2(6., 140.)) : vn(q * vec2(7., 150.) + seed * 9.);
  float early1 = 1. - smoothstep(.0, .3, t);   // the pore band at the start of each ring
  c *= 1. - .5 * smoothstep(.6, .88, pr) * (.25 + .75 * early1);
  float pr2 = P.x > 0. ? vn(q * vec2(3., 260.) + seed * 5., P * vec2(3., 260.)) : vn(q * vec2(3., 260.) + seed * 5.);
  c *= 1. - .25 * smoothstep(.7, .95, pr2);
  return c;
}`;

  // straight-grained wood for the frame tiles: seamless (integer periods), grain along x
  const FWOOD = `
vec3 fwood(vec2 p, vec3 a, vec3 b, float rings, float seed, out float t){
  float w = fbmP(p * vec2(2., 3.) + seed, vec2(2., 3.)) * .9 + fbmP(p * vec2(1., 6.) + seed * 2., vec2(1., 6.)) * .25;
  float r = (p.y + w * .25) * rings;
  t = fract(r);
  float late = smoothstep(.6, .9, t) * (1. - smoothstep(.93, 1., t));
  vec3 c = mix(a, b, late * .6 + .25 * fbmP(p * vec2(3., 8.) + seed * 3., vec2(3., 8.)));
  c *= .92 + .12 * vn(p * vec2(6., 180.) + seed, vec2(6., 180.));
  c *= 1. - .3 * smoothstep(.75, .95, vn(p * vec2(12., 300.) + seed * 5., vec2(12., 300.)));
  return c;
}`;
  const B = {};
  // ---------------------------------------------------------------- oak: a solid oak board, lines burnt into V-grooves, drilled holes
  B.oak = {
    ao: '.06', aok: '6.',
    glsl: WOOD + `
const float GW = .042;   // groove half-width
float plankOf(vec2 p, out float y0, out float y1){ float s0 = 1.72, s1 = 3.58, s2 = 5.36;
  if (p.y < s0){ y0 = -.2; y1 = s0; return 0.; } if (p.y < s1){ y0 = s0; y1 = s1; return 1.; } if (p.y < s2){ y0 = s1; y1 = s2; return 2.; } y0 = s2; y1 = 7.2; return 3.; }
float H(vec2 p){
  float y0, y1; plankOf(p, y0, y1);
  float h = 0.;
  float sd = min(abs(p.y - 1.72), min(abs(p.y - 3.58), abs(p.y - 5.36)));
  h -= .006 * smoothstep(.012, 0., sd);                                  // glued seams
  h += .0015 * (vn(p * vec2(2., 40.)) - .5);                             // the open grain
  float d = lineDist(p), dp = ptDist(p), r = .118;
  h -= .032 * clamp(1. - d / GW, 0., 1.) * smoothstep(r * .85, r * 1.05, dp);   // V-grooves (stopping at the holes)
  h -= .06 * smoothstep(r, r * .7, dp) + .01 * smoothstep(r * .7, 0., dp);   // drilled holes: a steep wall and a shallow cone
  h -= .03 * smoothstep(r + .02, r - .005, dp) * 0.;
  float sc = sdCross(p, .0);
  h -= .014 * clamp(1. - abs(sc + .13) / .016, 0., 1.);                  // a fine incised line round the cross
  h += edgeRound(p, .09);
  return h;
}
void M(vec2 p, inout Mat m){
  float y0, y1; float k = plankOf(p, y0, y1);
  float rt;
  vec3 c = woodCol(vec2(p.x * (k == 1. ? -1. : 1.) + k * 3.1, p.y - (y0 + y1) * .5), k + 1., hexc(208., 150., 84.), hexc(138., 84., 40.), .085 + .012 * k, vec2(0.), rt);
  c *= mix(vec3(1.), vec3(1.04, .99, .93), h21(vec2(k, 1.)) * .8);       // each plank a little different
  // the oak rays: short pale flecks across the grain
  float fl = vn(p * vec2(26., 3.2) + k * 13.); c = mix(c, c * 1.12 + .01, smoothstep(.86, .97, fl) * .5);
  // handling: a slightly darker, smoother patina towards the middle, grime at the edge
  float cen = length(p - 3.5) / 3.5; c *= .96 + .06 * cen;
  float d = lineDist(p), dp = ptDist(p), r = .118;
  float burn = smoothstep(GW * 1.25, GW * .25, d + .006 * (vn(p * 60.) - .5)) * smoothstep(r * .8, r * 1.02, dp);
  c = mix(c, hexc(58., 30., 14.), burn * .9);
  c = mix(c, hexc(84., 46., 22.), smoothstep(GW * 2.2, GW, d) * .25);   // a scorched halo
  float hole = smoothstep(r + .004, r - .01, dp);
  c = mix(c, hexc(92., 50., 22.), hole * .8);
  c = mix(c, hexc(36., 18., 8.), smoothstep(r * .8, r * .2, dp) * .55);
  c = mix(c, hexc(70., 38., 16.), smoothstep(r + .05, r, dp) * (1. - hole) * .55);   // scorched rim
  float sc = sdCross(p, 0.);
  c = mix(c, hexc(80., 44., 20.), clamp(1. - abs(sc + .13) / .02, 0., 1.) * .7);
  float sd = min(abs(p.y - 1.72), min(abs(p.y - 3.58), abs(p.y - 5.36)));
  c *= 1. - .35 * smoothstep(.01, 0., sd);
  m.alb = c; m.spec = .5; m.gloss = .38 - burn * .2; m.metal = 0.;
}`,
  };

  // ---------------------------------------------------------------- lux: polished Nero Marquina, solid gold inlay, gold studs, art-deco fans
  const MARBLE = `
float marbleV(vec2 p){
  vec2 q = p * .2 + vec2(fbm(p * .3 + 3.1), fbm(p * .3 + 9.7)) * .9;
  float f = fbm(q + 2.);
  float v = 1. - smoothstep(.0, .012, abs(f - .5));
  v *= smoothstep(.35, .6, fbm(p * .35 + 40.));               // the main veins come and go
  float v2 = (1. - smoothstep(.0, .006, abs(fbm(q * 2.4 + 7.) - .5))) * smoothstep(.45, .7, fbm(p * .5 + 4.));
  float cl = smoothstep(.62, .8, fbm(p * .6 + 77.)) * .25;      // faint clouds
  return clamp(v * .85 + v2 * .18 + cl, 0., 1.);
}`;
  B.lux = {
    ao: '.03', aok: '5.',
    glsl: MARBLE + `
const float GL = .024;
float fanD(vec2 p){   // the art-deco fans in the four corners: arcs and rays round the inner corner of each square
  vec2 o = vec2(p.x < 3.5 ? 2. : 5., p.y < 3.5 ? 2. : 5.);
  if (sdCross(p, 0.) < .0) return 9.;
  vec2 v = p - o; float r = length(v);
  float d = 9.;
  for (int i = 0; i < 3; i++) d = min(d, abs(r - (.62 + float(i) * .52)));
  float a = atan(abs(v.y), abs(v.x));
  float ray = abs(fract(a / (PI / 2.) * 9.) - .5) * (PI / 2. / 9.) * r;
  if (r > .62 && r < 1.66) d = min(d, ray);
  return d;
}
float H(vec2 p){
  float h = .0006 * (vn(p * 30.) - .5);
  float d = lineDist(p), dp = ptDist(p);
  h += .004 * sqrt(clamp(1. - (d / GL) * (d / GL), 0., 1.)) * smoothstep(.09, .12, dp);
  h += .045 * sqrt(clamp(1. - (dp / .095) * (dp / .095), 0., 1.));
  h += .004 * sqrt(clamp(1. - pow(abs(dp - .135) / .012, 2.), 0., 1.));
  float sc = sdCross(p, 0.);
  h += .003 * sqrt(clamp(1. - pow(abs(sc + .085) / .013, 2.), 0., 1.)) + .002 * sqrt(clamp(1. - pow(abs(sc + .135) / .006, 2.), 0., 1.));
  h += .002 * sqrt(clamp(1. - pow(fanD(p) / .006, 2.), 0., 1.));
  h += edgeRound(p, .07);
  return h;
}
void M(vec2 p, inout Mat m){
  float v = marbleV(p);
  vec3 c = mix(hexc(16., 16., 18.), hexc(26., 25., 27.), fbm(p * 1.4));
  c = mix(c, hexc(206., 200., 190.), v * .85);
  c = mix(c, hexc(120., 116., 110.), (1. - smoothstep(.0, .05, abs(fbm(p * 3. + 21.) - .5))) * .15);
  m.alb = c; m.spec = .35; m.gloss = .93; m.metal = 0.;
  float d = lineDist(p), dp = ptDist(p), sc = sdCross(p, 0.);
  float g = max(smoothstep(GL + .003, GL - .003, d), max(smoothstep(.1, .09, dp), smoothstep(.015, .009, abs(dp - .135))));
  g = max(g, max(smoothstep(.016, .01, abs(sc + .085)), smoothstep(.009, .004, abs(sc + .135))));
  g = max(g, smoothstep(.009, .004, fanD(p)));
  if (g > 0.) { vec3 gold = hexc(255., 208., 128.) * (.92 + .08 * vn(p * vec2(4., 200.))); m.alb = mix(m.alb, gold, g); m.metal = g; m.gloss = mix(m.gloss, .82, g); m.spec = mix(m.spec, 1., g); }
}
vec3 POST(vec2 p, vec3 c, Mat m, vec3 n){
  // the polished stone mirrors a tall window: a soft diagonal band of light
  float w = exp(-pow((p.x * .8 + p.y * .6 - 2.2) / .9, 2.)) * .05 + exp(-pow((p.x * .8 + p.y * .6 - 3.4) / .25, 2.)) * .025;
  return c + vec3(w) * (1. - m.metal) * vec3(.95, .97, 1.);
}`,
  };
  // ---------------------------------------------------------------- bauhaus: a printed sheet — fine black lines, four flat colour fields
  B.bauhaus = {
    ao: '.03', aok: '0.',
    glsl: `
const float LW = .017;
float aa(float d, float w){ return smoothstep(w + .004, w - .004, d); }
vec4 field(vec2 p){   // rgb + coverage of the colour fields and shapes in the corners
  if (sdCross(p, 0.) < .07) return vec4(0.);
  vec2 sq = vec2(p.x < 3.5 ? 1. : 6., p.y < 3.5 ? 1. : 6.);
  float box = aa(sdBox(p, sq, vec2(.86)), 0.);
  if (box <= 0.) return vec4(0.);
  vec3 navy = hexc(36., 50., 92.), mus = hexc(229., 170., 46.), ink = hexc(34., 34., 36.), stone = hexc(200., 194., 182.), paper = hexc(241., 236., 226.);
  vec3 c; vec2 q = p - sq;
  if (sq.x < 3. && sq.y < 3.) { c = navy; c = mix(c, paper, aa(length(p - vec2(.14)) - 1.25, 0.)); c = mix(c, mus, aa(length(q - vec2(.38, .38)) - .26, 0.)); }
  else if (sq.y < 3.) { c = mus; c = mix(c, ink, aa(max(length(p - vec2(6., 1.86)) - .7, p.y - 1.86), 0.)); c = mix(c, paper, aa(abs(q.y + .5) - .035, 0.) * step(q.x, .55) * step(-.75, q.x)); }
  else if (sq.x < 3.) { c = ink; c = mix(c, paper, aa(abs(fract((q.x + q.y) * 2.6) - .5) / 2.6 - .07, 0.) * step(length(q), .62)); c = mix(c, navy, aa(abs(q.x - .58) - .09, 0.)); }
  else { c = stone; c = mix(c, navy, aa(max(-(q.x + q.y) + .1, max(q.x - .86, q.y - .86)), 0.)); c = mix(c, mus, aa(length(q - vec2(-.42, -.42)) - .2, 0.)); }
  return vec4(c, box);
}
float H(vec2 p){ return .0012 * (vn(p * 90.) - .5) + .0008 * fbm(p * 14.); }
void M(vec2 p, inout Mat m){
  float fib = vn(p * vec2(200., 30.)) * .5 + vn(p * vec2(30., 220.)) * .5;
  vec3 c = hexc(241., 236., 226.) * (.975 + .03 * fib) * (.985 + .03 * fbm(p * 2.));
  vec4 f = field(p);
  vec3 fc = f.rgb * (.95 + .07 * vn(p * 160.)) * (.97 + .04 * fbm(p * 6.));
  c = mix(c, fc, f.a);
  float ink = max(aa(lineDist(p), LW), aa(ptDist(p), .072));
  ink = max(ink, aa(abs(sdCross(p, 0.) + .07), .006));
  c = mix(c, hexc(28., 28., 30.) * (.92 + .1 * vn(p * 200.)), ink);
  m.alb = c; m.spec = .15; m.gloss = .1; m.metal = 0.;
}`,
  };
  // ---------------------------------------------------------------- norse: a slab of grey-green stone — the cross raised and worn smooth,
  // pecked grooves and cup marks, cup-and-ring carvings and lichen in the rough corners
  B.norse = {
    ao: '.07', aok: '7.',
    glsl: `
float ringD(vec2 p){ vec2 o = vec2(p.x < 3.5 ? 1. : 6., p.y < 3.5 ? 1. : 6.); vec2 v = p - o; float r = length(v);
  vec2 out_ = normalize(vec2(p.x < 3.5 ? -1. : 1., p.y < 3.5 ? -1. : 1.));
  float d = min(abs(r - .34), abs(r - .6));
  d = min(d, sdSeg(p, o + out_ * .6, o + out_ * 1.15));
  return d + .01 * (vn(p * 40.) - .5); }
float H(vec2 p){
  float sc = sdCross(p, .05) + .03 * (fbm(p * 5.) - .5);
  float plat = smoothstep(.06, -.06, sc);
  float h = .06 * plat;
  h += mix(.012 * (fbm(p * 26.) - .5) + .01 * (cell2(p * 24.) - .5), .002 * (fbm(p * 18.) - .5) + .006 * (fbm(p * 1.5) - .5), plat);
  vec3 li = lineInfo(p);
  float w = .036 + .008 * (vn(vec2(li.y * 7.3, li.z * 6.)) - .5);
  float pk = cell2(p * 55.);
  float groove = smoothstep(w, w * .55, li.x + .006 * (vn(p * 50.) - .5));
  h -= groove * (.034 + .008 * pk);
  float dp = ptDist(p), r = .12 + .01 * (vn(p * 9.) - .5);
  h -= .055 * smoothstep(r, 0., dp) * (1. + .1 * pk);
  float cr = smoothstep(.028, .012, ringD(p)) * (1. - plat);
  h -= cr * .016;
  vec2 o = vec2(p.x < 3.5 ? 1. : 6., p.y < 3.5 ? 1. : 6.);
  h -= (1. - plat) * .04 * smoothstep(.1, 0., length(p - o));
  h += edgeRound(p, .12);
  return h;
}
void M(vec2 p, inout Mat m){
  float sc = sdCross(p, .05) + .03 * (fbm(p * 5.) - .5);
  float plat = smoothstep(.06, -.06, sc);
  vec3 c = mix(hexc(118., 124., 116.), hexc(158., 160., 148.), smoothstep(.3, .7, fbm(p * .7)));
  c = mix(c, hexc(150., 128., 100.), smoothstep(.55, .78, fbm(p * .5 + 5.)) * .3);   // iron staining
  c = mix(c, hexc(150., 152., 142.), (1. - smoothstep(.0, .008, abs(fbm(p * .4 + 12.) - .5))) * .25);   // thin quartz veins
  float sp = cell2(p * 70.);
  c = mix(c, hexc(42., 44., 42.), smoothstep(.25, .1, sp) * .7);
  c = mix(c, hexc(196., 194., 186.), smoothstep(.2, .05, cell2(p * 46. + 3.)) * .5);
  c *= mix(.84, 1.08, plat);
  vec3 li = lineInfo(p);
  float groove = smoothstep(.04, .02, li.x);
  float dp = ptDist(p);
  c = mix(c, c * .5, max(groove, smoothstep(.13, .06, dp)) * .85);
  c = mix(c, c * .7, smoothstep(.03, .012, ringD(p)) * (1. - plat));
  // lichen in the rough corners and on the shoulders of the cross
  float lk = smoothstep(.6, .68, fbm(p * 1.8 + 31.) + .12 * (fbm(p * 14.) - .5)) * (1. - plat * .9);
  c = mix(c, hexc(178., 186., 156.) * (.85 + .3 * fbm(p * 30.)), lk * .75);
  float lo = smoothstep(.66, .71, fbm(p * 2.4 + 77.) + .1 * (fbm(p * 20.) - .5)) * (1. - plat);
  c = mix(c, hexc(206., 120., 44.) * (.8 + .4 * fbm(p * 25.)), lo * .65);
  m.alb = c; m.spec = .3; m.gloss = mix(.12, .3, plat); m.metal = 0.;
}`,
  };
  // ---------------------------------------------------------------- delft: tin-glazed earthenware painted in cobalt
  B.delft = {
    ao: '.03', aok: '2.', tex: null,   // set below (the corner pictures)
    glsl: `
float paintL(vec2 p){   // the lines, painted with a brush: width and load vary along each stroke
  vec3 li = lineInfo(p);
  float w = .026 + .006 * sin(li.z * 3.1 + li.y * 1.7) + .004 * (vn(vec2(li.z * 4., li.y * 9.)) - .5);
  return smoothstep(w + .005, w - .004, li.x);
}
float H(vec2 p){ return .0012 * (fbm(p * 3.) - .5) + .0006 * (vn(p * 45.) - .5) - .002 * smoothstep(.02, .0, cell2(p * 18.) - .015) + edgeRound(p, .1); }
void M(vec2 p, inout Mat m){
  vec3 c = mix(hexc(238., 241., 243.), hexc(228., 233., 238.), fbm(p * 1.3));
  float L = paintL(p);
  float dp = ptDist(p);
  float P = max(smoothstep(.088, .078, dp), smoothstep(.013, .006, abs(dp - .13)));
  float sc = sdCross(p, 0.);
  float O = max(smoothstep(.016, .009, abs(sc + .08)), smoothstep(.008, .003, abs(sc + .13)));
  vec4 tx = texture(tPic, p / 7.);
  float k = max(max(L, P), O);
  float load = .75 + .25 * fbm(p * 7.) ;
  float edge = smoothstep(.0, .6, k) * (1. - smoothstep(.6, 1., k));
  float dens = clamp(k * load + edge * .25, 0., 1.);
  float pic = tx.a * (.55 + .45 * (1. - tx.r));   // the pictures: alpha = paint, red channel = lighter wash
  float blur = textureLod(tPic, p / 7., 4.).a;
  float pool = clamp((tx.a - blur) * 2.2, 0., 1.);  // the cobalt pools at the edge of each brush mark
  float wash = .62 + .38 * smoothstep(.25, .75, fbm(p * 5. + 3.)) + .12 * (fbm(p * 40.) - .5);
  dens = max(dens, clamp(pic * wash + pool * .5 * tx.a, 0., 1.));
  vec3 cob = mix(hexc(126., 152., 206.), hexc(24., 48., 128.), smoothstep(.1, .95, dens));
  c = mix(c, cob, smoothstep(.02, .3, dens));
  m.alb = c; m.spec = .7; m.gloss = .9; m.metal = 0.;
}`,
  };
  // ---------------------------------------------------------------- SVG art used as textures (2048 px = the whole board, 1 cell = 2048/7)
  const U = 2048 / 7;
  const segPath = (k) => ART_SEGS.map(s => `M${(s[0] * U).toFixed(1)},${(s[1] * U).toFixed(1)}L${(s[2] * U).toFixed(1)},${(s[3] * U).toFixed(1)}`).join('');
  const PTS = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if ((r >= 2 && r <= 4) || (c >= 2 && c <= 4)) PTS.push([(c + .5) * U, (r + .5) * U]);
  const crossD = (ins, rad) => {   // the outline of the cross, inset by ins (px), corners rounded by rad
    const a = ins, b = 2 * U + ins, c = 5 * U - ins, d = 7 * U - ins, r = rad;
    const P = [[b, a], [c, a], [c, b], [d, b], [d, c], [c, c], [c, d], [b, d], [b, c], [a, c], [a, b], [b, b]];
    const conv = [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0];   // outer (rounded) corners vs the inner ones
    let s = '';
    for (let i = 0; i < 12; i++) {
      const p = P[i], q = P[(i + 11) % 12], n = P[(i + 1) % 12];
      const rr = conv[i] ? r : r * .5;
      const v1 = [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])], v2 = [Math.sign(n[0] - p[0]), Math.sign(n[1] - p[1])];
      const s1 = [p[0] + v1[0] * rr, p[1] + v1[1] * rr], s2 = [p[0] + v2[0] * rr, p[1] + v2[1] * rr];
      s += (i ? 'L' : 'M') + s1.join(',') + `Q${p[0]},${p[1]} ${s2.join(',')}`;
    }
    return s + 'Z';
  };
  const svgWrap = (body, defs) => `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><defs>${defs || ''}</defs>${body}</svg>`;
  const at = (x, y, s, body, rot) => `<g transform="translate(${x},${y}) scale(${s})${rot ? ` rotate(${rot})` : ''}">${body}</g>`;

  // Delft: four painted roundels in the corners (alpha = paint; fill #000 = full cobalt, #fff = a pale wash)
  function delftPics() {
    const D = '#000', W = '#fff';
    const fox = `<path fill="${D}" d="M20,70C40,50 70,45 100,50C115,40 125,30 135,28L139,8L147,26L155,10L158,32C166,36 176,42 188,47C178,53 166,55 155,56C150,62 148,70 152,80L164,104L155,108L139,84C125,84 110,84 95,82L82,102L62,112L57,105L71,92C61,86 51,81 43,79C31,88 15,98 -6,94C2,82 9,72 20,70Z"/>
      <path fill="${W}" opacity=".9" d="M-6,94C2,86 8,82 14,82C10,88 4,92 -6,94Z"/><circle cx="160" cy="40" r="3.2" fill="${W}"/>
      <path d="M60,62C80,58 100,60 118,64M48,72C60,70 70,70 80,72" stroke="${W}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;
    const goose = `<path fill="${D}" d="M30,120C30,95 60,85 95,88C120,90 140,100 152,112L166,102L156,124C142,142 110,152 80,150C50,148 30,138 30,120Z"/>
      <path fill="${D}" d="M54,99C42,80 38,60 44,42C48,30 58,24 66,28C73,32 71,40 65,45C58,53 60,72 72,92Z"/>
      <path fill="${D}" d="M46,33L20,40L46,43Z"/><circle cx="56" cy="34" r="2.6" fill="${W}"/>
      <path d="M70,112C90,104 115,104 138,114M76,126C95,120 112,121 128,128" stroke="${W}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M82,148L80,172L70,176M100,148L102,172L112,176" stroke="${D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    const mill = `<path fill="${D}" d="M78,150L86,70L114,70L122,150Z"/><path fill="${D}" d="M82,72Q100,52 118,72Z"/>
      <rect x="94" y="122" width="12" height="28" fill="${W}"/><rect x="96" y="92" width="8" height="10" fill="${W}"/>
      <g transform="translate(100,66) rotate(18)"><g fill="${D}">${[0, 90, 180, 270].map(a => `<g transform="rotate(${a})"><rect x="-3" y="-78" width="6" height="78"/><path d="M3,-76h16v56h-16z" fill="none" stroke="${D}" stroke-width="3"/><path d="M3,-62h16M3,-48h16M3,-34h16" stroke="${D}" stroke-width="2"/></g>`).join('')}</g></g>
      <path d="M10,152Q60,144 100,150T196,150" stroke="${D}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M14,162Q50,158 80,161M120,161Q160,158 190,162" stroke="${D}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M30,40q6,-6 12,0q6,-6 12,0M150,28q5,-5 10,0q5,-5 10,0" stroke="${D}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const tulip = `<path fill="${D}" d="M70,150L130,150L122,178L78,178Z"/><path d="M74,160h52" stroke="${W}" stroke-width="3"/>
      ${[[100, 40, 0], [66, 62, -18], [134, 62, 18]].map(([x, y, a]) => `<g transform="translate(${x},${y}) rotate(${a})"><path d="M0,10Q-4,60 0,${150 - y - 10}" transform="rotate(${-a})" stroke="${D}" stroke-width="4" fill="none"/><path fill="${D}" d="M-16,-4Q-18,22 0,26Q18,22 16,-4L8,6L0,-10L-8,6Z"/><path d="M-6,4Q0,18 6,4" stroke="${W}" stroke-width="2.5" fill="none" opacity=".8"/></g>`).join('')}
      <path fill="${D}" d="M98,140Q70,110 60,96Q84,108 100,132Z"/><path fill="${D}" d="M102,140Q130,110 140,96Q116,108 100,132Z"/>`;
    const roundel = (cx, cy, art, sc, dx, dy) => {
      const R = U * .8;
      return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${D}" stroke-width="9"/><circle cx="${cx}" cy="${cy}" r="${R - 16}" fill="none" stroke="${D}" stroke-width="3.5"/>
        <circle cx="${cx}" cy="${cy}" r="${R - 24}" fill="${W}" opacity=".16"/>` + at(cx + dx, cy + dy, sc, art);
    };
    // little corner ornaments of Delft tiles (an "ox head" in the outer corner of each square)
    const orn = (x, y, sx, sy) => `<g transform="translate(${x},${y}) scale(${sx},${sy})"><path fill="${D}" d="M14,14C40,18 52,30 56,56C40,46 30,40 14,14Z"/><path fill="${D}" d="M14,14C18,40 30,52 56,56C46,40 40,30 14,14Z"/><circle cx="62" cy="62" r="7" fill="${D}"/></g>`;
    const c1 = U, c6 = 6 * U;
    return svgWrap(
      roundel(c1, c1, fox, 2.25, -215, -165) + roundel(c6, c1, mill, 1.85, -185, -175) + roundel(c1, c6, goose, 2.1, -195, -205) + roundel(c6, c6, tulip, 1.95, -195, -190)
      + orn(0, 0, 1, 1) + orn(7 * U, 0, -1, 1) + orn(0, 7 * U, 1, -1) + orn(7 * U, 7 * U, -1, -1));
  }
  B.delft.tex = { tPic: delftPics() };

  // The meadow (cute): a sunny pasture — a lawn in the shape of the cross with stitched edges, cream paths, stepping stones,
  // and little scenes in the corners (the fox's den, an apple tree, a pond, hay and a fence)
  function meadowArt(height) {
    const flower = (x, y, s, c) => at(x, y, s, `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-9" rx="6" ry="9" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="5.5" fill="#ffd34d"/>`);
    const tuft = (x, y, s) => at(x, y, s, `<path d="M-10,6Q-8,-6 -4,-12M0,6Q0,-8 2,-16M8,6Q8,-4 12,-10" stroke="#6ea84a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`);
    let r = 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const deco = [];
    const inCorner = (x, y) => (x < 2 * U - 30 || x > 5 * U + 30) && (y < 2 * U - 30 || y > 5 * U + 30);
    for (let i = 0; i < 260; i++) { const x = rnd() * 2048, y = rnd() * 2048; if (!inCorner(x, y)) continue; deco.push(rnd() < .7 ? tuft(x, y, 1 + rnd() * .6) : flower(x, y, .8 + rnd() * .5, ['#ffffff', '#ffd1e0', '#fff1a8'][Math.floor(rnd() * 3)])); }
    const c1 = U, c6 = 6 * U;
    const den = at(c1, c1, 1, `<ellipse cx="10" cy="20" rx="210" ry="170" fill="#c99a68"/><ellipse cx="0" cy="0" rx="200" ry="160" fill="#d9ae7c"/>
      <ellipse cx="-20" cy="-30" rx="150" ry="100" fill="#e4bd8e" opacity=".7"/><ellipse cx="10" cy="30" rx="90" ry="62" fill="#5a3824"/><ellipse cx="10" cy="40" rx="70" ry="44" fill="#3d2416"/>
      <ellipse cx="-120" cy="70" rx="28" ry="20" fill="#bfb6a8"/><ellipse cx="-126" cy="64" rx="18" ry="10" fill="#d8d0c4"/><ellipse cx="130" cy="-60" rx="22" ry="16" fill="#bfb6a8"/>
      ${[[-110, -70, 1], [-70, -110, .8], [140, 60, .9]].map(([x, y, s]) => at(x, y, s, `<rect x="-8" y="0" width="16" height="30" rx="7" fill="#fff6e6"/><ellipse cx="0" cy="0" rx="34" ry="22" fill="#ef5a4c"/><ellipse cx="-8" cy="-6" rx="24" ry="12" fill="#ff7a6a"/><circle cx="-12" cy="-4" r="5" fill="#fff"/><circle cx="10" cy="-8" r="4" fill="#fff"/><circle cx="2" cy="6" r="3.5" fill="#fff"/>`)).join('')}`);
    const tree = at(c6, c1, 1, `<ellipse cx="24" cy="30" rx="230" ry="210" fill="#4e8f3e" opacity=".55"/>
      ${[[-80, -40, 130], [70, -70, 120], [90, 70, 130], [-60, 90, 120], [0, 0, 150]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#5fae4c"/>`).join('')}
      ${[[-100, -70, 70], [50, -100, 60], [70, 40, 64], [-80, 60, 60], [-10, -20, 80]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#79c862" opacity=".9"/>`).join('')}
      ${[[-120, -90, 30], [30, -130, 26], [50, 10, 30], [-100, 30, 26]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#a6e08a" opacity=".8"/>`).join('')}
      ${[[-40, -100], [100, -20], [20, 110], [-130, 40], [130, 100], [-60, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="#e8483f"/><circle cx="${x - 5}" cy="${y - 5}" r="5" fill="#fff" opacity=".7"/><path d="M${x},${y - 16}l4,-9" stroke="#6b3b1e" stroke-width="4" stroke-linecap="round"/>`).join('')}`);
    const pond = at(c1, c6, 1, `<path d="M-200,-40C-190,-150 -60,-200 40,-170C170,-140 220,-40 190,60C160,170 40,200 -60,180C-170,160 -210,70 -200,-40Z" fill="#7fc4e4"/>
      <path d="M-170,-40C-160,-130 -60,-170 30,-145C150,-120 190,-40 165,50C140,140 40,170 -50,155C-150,138 -180,60 -170,-40Z" fill="#9ad8f2"/>
      <path d="M-120,-60q30,-14 60,0M40,-90q26,-12 52,0M-40,80q30,-12 60,0" stroke="#e6f7ff" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${[[-70, 20, 46, 20], [80, 40, 40, -30], [20, -60, 34, 60]].map(([x, y, r, a]) => `<path d="M${x},${y}m${r},0A${r},${r} 0 1 1 ${x + r * Math.cos(.5)},${y + r * Math.sin(.5)}L${x},${y}Z" transform="rotate(${a} ${x} ${y})" fill="#6cbf5a"/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="#86d470" opacity=".7"/>`).join('')}
      <g transform="translate(80,40)">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-14" rx="9" ry="15" fill="#ffb3cf" transform="rotate(${a})"/>`).join('')}<circle r="8" fill="#ffe27a"/></g>
      ${[[-190, 120], [-170, 140], [180, -130]].map(([x, y]) => `<path d="M${x},${y}q4,-60 -6,-110" stroke="#5f9a3e" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="${x - 4}" cy="${y - 96}" rx="9" ry="24" fill="#a0683c"/>`).join('')}`);
    // the geese's hut: a little shingled roof seen from above, a fence, a feed trough and flowers
    const farm = at(c6, c6, 1, `<rect x="-150" y="-150" width="250" height="210" rx="18" fill="#5f8f42" opacity=".35" transform="translate(14,16)"/>
      <path d="M-150,-150H100V60H-150Z" fill="#e2714f"/><path d="M-150,-45H100" stroke="#b9533a" stroke-width="12"/>
      ${[-125, -95, -65, -35].map(y => `<path d="M-150,${y}H100" stroke="#cf6145" stroke-width="5" opacity=".8"/>`).join('')}${[-15, 15, 45].map(y => `<path d="M-150,${y}H100" stroke="#f08a66" stroke-width="5" opacity=".8"/>`).join('')}
      <rect x="-150" y="-150" width="250" height="210" rx="16" fill="none" stroke="#a9432e" stroke-width="10"/>
      <rect x="40" y="-110" width="36" height="36" rx="6" fill="#d9d2c6"/><rect x="46" y="-118" width="24" height="10" rx="4" fill="#8a8178"/>
      <path d="M-200,170L200,170M-200,190L200,190" stroke="#b78457" stroke-width="16" stroke-linecap="round"/>${[-190, -60, 70, 190].map(x => `<rect x="${x - 15}" y="150" width="30" height="62" rx="9" fill="#9b6a40"/><rect x="${x - 15}" y="150" width="30" height="16" rx="8" fill="#c08a5c"/>`).join('')}
      <rect x="140" y="-60" width="56" height="130" rx="14" fill="#a8774c"/><rect x="150" y="-50" width="36" height="110" rx="10" fill="#f2d27a"/>
      ${[[-170, 110], [10, 110], [-180, -190], [150, -150]].map(([x, y]) => flower(x, y, 1.4, '#ffffff')).join('')}`);
    const lawnD = crossD(18, U * .32);
    const roads = segPath();
    if (height) {   // the height map: lawn raised a little, paths sunk, stones and the scenes puffy
      return svgWrap(`<rect width="2048" height="2048" fill="#606060"/><path d="${lawnD}" fill="#7a7a7a" filter="url(#b8)"/>
        <path d="${roads}" stroke="#5a5a5a" stroke-width="${U * .17}" stroke-linecap="round" filter="url(#b8)"/>
        ${PTS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${U * .15}" fill="#d0d0d0" filter="url(#b8)"/>`).join('')}
        <circle cx="${c6 + 10}" cy="${c1}" r="200" fill="#b0b0b0" filter="url(#b30)"/><circle cx="${c1}" cy="${c1}" r="190" fill="#9a9a9a" filter="url(#b30)"/><ellipse cx="${c1 + 10}" cy="${c1 + 34}" rx="80" ry="50" fill="#303030" filter="url(#b8)"/>
        <path d="M${c1 - 200},${c6 - 40}C${c1 - 190},${c6 - 150} ${c1 + 170},${c6 - 140} ${c1 + 190},${c6 + 60}C${c1 + 160},${c6 + 170} ${c1 - 170},${c6 + 160} ${c1 - 200},${c6 - 40}Z" fill="#505050" filter="url(#b8)"/>
        ${[[-70, -30, 1.25], [90, -90, 1], [100, 60, .9]].map(([x, y, s]) => `<circle cx="${c6 + x}" cy="${c6 + y}" r="${70 * s}" fill="#bdbdbd" filter="url(#b8)"/>`).join('')}`,
        `<filter id="b8"><feGaussianBlur stdDeviation="8"/></filter><filter id="b30"><feGaussianBlur stdDeviation="30"/></filter>`);
    }
    return svgWrap(`<rect width="2048" height="2048" fill="#93cb63"/>
      <rect width="2048" height="2048" fill="url(#gl)"/>
      ${deco.join('')}${den}${tree}${pond}${farm}
      <path d="${lawnD}" fill="#6fae4a" transform="translate(6,10)" opacity=".35" filter="url(#sh)"/>
      <path d="${lawnD}" fill="#bfe38c"/><path d="${crossD(46, U * .26)}" fill="none" stroke="#ffffff" stroke-width="7" stroke-dasharray="26 18" stroke-linecap="round" opacity=".85"/>
      <path d="${roads}" stroke="#d8bc82" stroke-width="${U * .17}" stroke-linecap="round" fill="none"/>
      <path d="${roads}" stroke="#fbefc9" stroke-width="${U * .12}" stroke-linecap="round" fill="none"/>
      ${PTS.map(([x, y]) => `<circle cx="${x + 5}" cy="${y + 8}" r="${U * .16}" fill="#7a9a50" opacity=".35"/><circle cx="${x}" cy="${y}" r="${U * .155}" fill="#fffaf0" stroke="#d6b77a" stroke-width="${U * .025}"/><ellipse cx="${x - U * .05}" cy="${y - U * .055}" rx="${U * .06}" ry="${U * .035}" fill="#ffffff"/>`).join('')}`,
      `<radialGradient id="gl" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#d8f7a0" stop-opacity=".45"/><stop offset="1" stop-color="#5f9e3c" stop-opacity=".35"/></radialGradient><filter id="sh"><feGaussianBlur stdDeviation="10"/></filter>`);
  }
  B.meadow = {
    ao: '.05', aok: '3.', tex: { tAlb: meadowArt(false), tHgt: meadowArt(true) },
    glsl: `
float H(vec2 p){ return texture(tHgt, p / 7.).r * .05 + .0015 * (fbm(p * 30.) - .5) + edgeRound(p, .1); }
void M(vec2 p, inout Mat m){
  vec3 c = pow(texture(tAlb, p / 7.).rgb, vec3(2.2));
  c *= .96 + .06 * fbm(p * 22.);    // a soft gouache texture
  m.alb = c; m.spec = .12; m.gloss = .15; m.metal = 0.;
}`,
  };
  // ---------------------------------------------------------------- frames (seamless tiles)
  const F = {};
  F.oak = { glsl: FWOOD + `
float H(vec2 p){ return .002 * (vn(p * vec2(4., 120.), vec2(4., 120.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(110., 66., 34.), hexc(58., 32., 14.), 9., 4., rt);
  m.alb = c; m.spec = .5; m.gloss = .45; m.metal = 0.; }` };

  const MAT = `struct Mat { vec3 alb; float spec; float gloss; float metal; float ao; };\n`;
  F.lux = { glsl: FWOOD + `
float H(vec2 p){ return .0008 * (vn(p * vec2(4., 160.), vec2(4., 160.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(84., 50., 26.), hexc(16., 10., 6.), 14., 7., rt);
  m.alb = c; m.spec = .9; m.gloss = .9; m.metal = 0.; }` };
  F.bauhaus = { glsl: `
float H(vec2 p){ return .0015 * (vn(p * 120., vec2(120.)) - .5); }
void M(vec2 p, inout Mat m){ m.alb = hexc(38., 38., 40.) * (.94 + .1 * vn(p * 240., vec2(240.)) + .04 * fbmP(p * 6., vec2(6.))); m.spec = .1; m.gloss = .1; m.metal = 0.; }` };
  F.meadow = { glsl: FWOOD + `
float H(vec2 p){ return .002 * (vn(p * vec2(4., 90.), vec2(4., 90.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(236., 202., 156.), hexc(208., 164., 114.), 7., 3., rt);
  m.alb = c; m.spec = .3; m.gloss = .25; m.metal = 0.; }` };
  F.norse = { glsl: FWOOD + `
float H(vec2 p){ float rt; fwood(p, vec3(0.), vec3(1.), 8., 5., rt); return .006 * smoothstep(.5, 1., rt) + .003 * (vn(p * vec2(6., 160.), vec2(6., 160.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(136., 132., 122.), hexc(74., 70., 64.), 8., 5., rt);
  m.alb = c; m.spec = .15; m.gloss = .12; m.metal = 0.; }` };
  F.delft = { glsl: FWOOD + `
float H(vec2 p){ return .001 * (vn(p * vec2(4., 120.), vec2(4., 120.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(58., 42., 30.), hexc(24., 16., 10.), 10., 9., rt);
  m.alb = c; m.spec = .6; m.gloss = .6; m.metal = 0.; }` };
  window.ART_BOARDS = function (kind, key) {
    const post = g => /vec3 POST\(/.test(g) ? g : g + `\nvec3 POST(vec2 p, vec3 c, Mat m, vec3 n){ return c; }\n`;
    if (kind === 'frame') {
      const f = F[key];
      return { glsl: `const float SCALE = 1.; const float AOK = ${f.aok || '0.'};\n` + MAT + FRAME_FINISH + post(f.glsl) + TEMPLATE(f.ao), tex: f.tex, aa: 2 };
    }
    const b = B[key];
    return { glsl: `const float SCALE = 7.; const float AOK = ${b.aok || '4.'};\n` + MAT + BOARD_FINISH + post(b.glsl) + TEMPLATE(b.ao), tex: b.tex, aa: b.aa || 2 };
  };
})();
