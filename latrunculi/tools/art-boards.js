/* Board and frame designs for tools/art.html (Ludus Latrunculorum, 2026-11-18). Each design gives GLSL for
     float H(vec2 p)  — height (cell units; p in cell units 0..8, y down)
     void M(vec2 p, inout Mat m) — the material at p
   and the shared template lights it. The grid (the 7 inner lines each way) is baked into every board; the page hides its own lines.
   Frames are seamless tiles (p 0..1). */
(function () {
  const TEMPLATE = (ao) => `
vec4 shadeAt(vec2 uv){
  vec2 p = uv * SCALE;
  float e = .0035 * SCALE / 8.;
  float h0 = H(p);
  float hx = H(p + vec2(e, 0.)) - H(p - vec2(e, 0.)), hy = H(p + vec2(0., e)) - H(p - vec2(0., e));
  vec3 n = normalize(vec3(-hx / (2. * e), -hy / (2. * e), 1.));
  float r = ${ao || '.05'} * SCALE / 8.;
  float avg = (H(p + vec2(r, 0.)) + H(p - vec2(r, 0.)) + H(p + vec2(0., r)) + H(p - vec2(0., r))) * .25;
  Mat m = Mat(vec3(.5), .3, .3, 0., clamp(1. - (avg - h0) * AOK, .35, 1.));
  M(p, m);
  vec3 c = lit(m.alb, n, m.spec, m.gloss, m.metal, m.ao);
  c = POST(p, c, m, n);
  c *= FINISH(uv);
  return vec4(c, 1.);
}`;
  const BOARD_FINISH = `vec3 FINISH(vec2 uv){ return vec3(1.06 - .12 * (uv.x * .45 + uv.y * .55)); }
float edgeRound(vec2 p, float w){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return -w * .6 * pow(1. - clamp(k / w, 0., 1.), 2.); }`;
  const FRAME_FINISH = `vec3 FINISH(vec2 uv){ return vec3(1.); }`;
const WOOD = `
vec3 woodCol(vec2 q, float seed, vec3 early, vec3 lateC, float ringW, vec2 P, out float ringT){
  // q: x along the grain, y across (cell units); P: period for seamless tiles (0 = none)
  float y0 = (P.x > 0. ? .5 : .0) + (h21(vec2(seed, 3.)) - .5) * .8;
  float wob = P.x > 0. ? fbmP(vec2(q.x * .35 / P.x * P.x, seed), vec2(P.x * .35, 0.)) : fbm(vec2(q.x * .22 + seed * 7., seed));
  float dep = 1.7 + 1.4 * wob;
  float dy = q.y - y0 + .25 * (P.x > 0. ? fbmP(q * vec2(.5, 1.5) + seed, P * vec2(.5, 1.5)) : fbm(q * vec2(.35, 1.2) + seed * 3.)) ;
  float r = sqrt(dy * dy * 2.4 + dep * dep);
  float ring = r / ringW + .55 * (P.x > 0. ? fbmP(q * vec2(.8, 3.) + seed * 2., P * vec2(.8, 3.)) : fbm(q * vec2(.6, 2.6) + seed * 5.));
  float t = fract(ring); ringT = t;
  float late = smoothstep(.62, .9, t) * (1. - smoothstep(.97, 1., t));
  vec3 c = mix(early, lateC, late * .32 + smoothstep(.88, .985, t) * (1. - smoothstep(.985, 1., t)) * .3);
  c *= .96 + .06 * fbm(q * vec2(.25, .9) + seed * 4.);   // broad, quiet colour drift
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
  const B = {}, F = {};

  // ================================================================ stone: a slab of weathered travertine, the grid cut with a chisel
  // (the boards scratched into the steps of the Basilica Julia and the forum). Hand-cut V-grooves that wander a little, chipped lips,
  // the long pores of travertine, dirt in the cuts.
  B.stone = {
    ao: '.07', aok: '7.',
    glsl: `
float wob(vec3 gi){ return .02 * (fbm(vec2(gi.z * 1.3, gi.y * 7.1)) - .5) + .005 * (gn(vec2(gi.z * 9., gi.y * 3.)) - .5); }
float gw(vec3 gi){ return .046 + .024 * (gn(vec2(gi.z * 2.2, gi.y * 5.)) - .5); }
float pores(vec2 p){   // travertine: long holes running along the bedding
  vec2 q = p * vec2(2.4, 11.) + vec2(fbm(p * .7) * 3., fbm(p * .4) * 2.);
  float v = gn(q + 3.) * .55 + gn(q * 2.3 + 9.) * .3 + gn(q * 5.1) * .15;
  return smoothstep(.76, .92, v) * smoothstep(.4, .7, fbm(p * .45 + 11.));
}
float gdist(vec2 p, out float w){ vec3 gi = gridInfo(p); w = gw(gi); return abs((gi.y < 10. ? p.x - gi.y : p.y - (gi.y - 10.)) - wob(gi)); }
float chipOf(vec2 p, float d, float w){ float k = smoothstep(.6, .78, fbm(p * 7. + 4.)); return k * smoothstep(w * (1.5 + .9 * k), w * .9, d); }
float H(vec2 p){
  float h = .007 * (fbm(p * .45) - .5) + .004 * (fbm(p * 4.) - .5) + .0025 * (fbm(p * 18.) - .5) + .0012 * (gn(p * 90.) - .5);
  h -= .006 * smoothstep(.55, .8, fbm(p * 2.2 + 9.));   // weathered hollows
  h -= .02 * pores(p);
  h -= .006 * smoothstep(.2, .0, cell2(p * 14.)) * step(.78, h21(floor(p * 14.)));   // small pits
  float w; float d = gdist(p, w);
  h -= (.034 + .008 * (fbm(p * 9.) - .5)) * clamp(1. - d / w, 0., 1.);
  h -= .01 * chipOf(p, d, w) * (.7 + .6 * fbm(p * 30.));
  h += edgeRound(p, .1);
  return h;
}
void M(vec2 p, inout Mat m){
  float band = fbm(vec2(p.x * .18, p.y * 1.4 + fbm(p * .4) * 1.2));
  vec3 c = mix(hexc(222., 214., 198.), hexc(188., 174., 150.), smoothstep(.3, .75, band));
  c = mix(c, hexc(234., 228., 214.), smoothstep(.6, .85, fbm(p * .9 + 30.)) * .5);
  c = mix(c, c * hexc(250., 236., 214.) * 1.04, smoothstep(.4, .7, fbm(p * .25 + 70.)) * .6);
  c *= .9 + .16 * fbm(p * 5.);
  c *= .82 + .3 * fbm(p * 60.);
  c = mix(c, c * .78, smoothstep(.55, .8, fbm(p * 2.2 + 9.)) * .8);   // dirt in the hollows                                            // the grain of the stone
  c = mix(c, hexc(96., 86., 74.), smoothstep(.2, .02, cell2(p * 34.)) * step(.6, h21(floor(p * 34.))) * .6);
  c = mix(c, hexc(246., 240., 228.), smoothstep(.2, .02, cell2(p * 22. + 5.)) * step(.75, h21(floor(p * 22. + 5.))) * .5);   // dark specks
  c = mix(c, hexc(120., 108., 90.), pores(p) * .7);
  c = mix(c, hexc(150., 144., 132.), smoothstep(.55, .9, fbm(p * .35 + 5.)) * .22);
  c = mix(c, hexc(186., 132., 84.), smoothstep(.7, .9, fbm(p * .8 + 50.)) * .14);
  float li = smoothstep(.22, .04, cell2(p * 3.3 + 40.)) * step(.88, h21(floor(p * 3.3 + 40.))) * smoothstep(.4, .6, fbm(p * 4. + 2.));
  c = mix(c, hexc(212., 206., 166.), li * .55);                              // pale lichen
  float w; float d = gdist(p, w);
  float cut = clamp(1. - d / w, 0., 1.);
  c = mix(c, hexc(112., 94., 72.) * (.85 + .3 * fbm(p * 50.)), smoothstep(.0, .7, cut) * .78);
  c = mix(c, hexc(238., 230., 212.), chipOf(p, d, w) * (1. - cut) * .45);    // fresh stone where a chip came off
  m.alb = c; m.spec = .28; m.gloss = .22 + .1 * smoothstep(.4, .0, length(p - 4.) / 4.); m.metal = 0.;
}`,
  };
  F.stone = { glsl: `
float H(vec2 p){
  float t = fract((p.x * 3. + p.y * 5.) * 2. + .3 * fbmP(p * 4., vec2(4.)));      // claw-chisel tooling, seamless
  return .004 * smoothstep(.0, .5, abs(t - .5)) + .006 * (fbmP(p * 5., vec2(5.)) - .5) + .002 * (vn(p * 90., vec2(90.)) - .5);
}
void M(vec2 p, inout Mat m){
  vec3 c = mix(hexc(132., 116., 92.), hexc(164., 146., 116.), smoothstep(.3, .7, fbmP(p * 3., vec2(3.))));
  c *= .92 + .12 * vn(p * 60., vec2(60.));
  c = mix(c, hexc(96., 84., 68.), smoothstep(.62, .85, fbmP(p * 6. + 3., vec2(6.))) * .4);
  m.alb = c; m.spec = .2; m.gloss = .15; m.metal = 0.; }` };

  // ================================================================ wood: a birch plywood board, the grid burnt in with a laser (a modern
  // workshop's take on the game), a double border line burnt round the edge
  B.wood = {
    ao: '.04', aok: '3.',
    glsl: WOOD + `
float burnW(float d, float w){ return smoothstep(w + .004, w - .004, d); }
float bord(vec2 p){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return min(abs(k - .1), abs(k - .155)); }
float H(vec2 p){
  float h = .0012 * (vn(p * vec2(2., 50.)) - .5) + .0015 * (fbm(p * .6) - .5);
  float d = gridDist(p);
  h -= .005 * burnW(d, .016) + .004 * burnW(bord(p), .008);
  h += edgeRound(p, .06);
  return h;
}
void M(vec2 p, inout Mat m){
  float rt;
  // rotary-cut birch veneer: wide, wavy figure, very little contrast
  vec3 c = woodCol(vec2(p.y * .9 + 2.3, p.x * .55 - 4. + .8 * fbm(p * .2)), 3.7, hexc(236., 214., 178.), hexc(206., 172., 128.), .22, vec2(0.), rt);
  c = mix(c, hexc(240., 224., 194.), .25);
  c *= .97 + .05 * fbm(p * vec2(.4, 3.) + 7.);
  float d = gridDist(p), b = bord(p);
  float halo = max(smoothstep(.07, .016, d), smoothstep(.04, .008, b) * .8);
  c = mix(c, hexc(170., 116., 66.), halo * .45);
  float burn = max(burnW(d + .002 * (vn(p * 300.) - .5), .016), burnW(b, .008));
  c = mix(c, hexc(66., 38., 20.) * (.85 + .3 * vn(p * 200.)), burn);
  m.alb = c; m.spec = .3; m.gloss = .3 - burn * .15; m.metal = 0.;
}`,
  };
  F.wood = { glsl: FWOOD + `
float H(vec2 p){ return .0015 * (vn(p * vec2(4., 120.), vec2(4., 120.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(118., 74., 42.), hexc(70., 40., 20.), 8., 2., rt);
  m.alb = c; m.spec = .45; m.gloss = .4; m.metal = 0.; }` };

  // ================================================================ abstract: a matte plaster sheet with large flat shapes in Roman colours —
  // an arch, the sun, a half moon — printed over each other; the grid a fine charcoal line
  B.abstract = {
    ao: '.03', aok: '0.',
    glsl: `
float aa(float d){ return smoothstep(.004, -.004, d); }
float sdArch(vec2 p, vec2 base, float hw, float top){   // a round arch standing on base (y down): a box and a half disc
  float rect = sdBox(p, vec2(base.x, (base.y + top + hw) * .5), vec2(hw, (base.y - top - hw) * .5));
  float disc = length(p - vec2(base.x, top + hw)) - hw;
  return min(rect, max(disc, p.y - (top + hw)));
}
vec3 shapes(vec2 p, vec3 c){
  vec3 terra = hexc(204., 118., 86.), ochre = hexc(222., 172., 92.), sage = hexc(150., 164., 134.), teal = hexc(58., 98., 112.), rose = hexc(226., 176., 158.);
  float tex = .95 + .07 * vn(p * 140.) + .03 * fbm(p * 3.);
  c = mix(c, c * mix(vec3(1.), sage * tex * 1.15, .95), aa(length(p - vec2(-.2, 6.3)) - 2.1));
  c = mix(c, c * mix(vec3(1.), ochre * tex * 1.12, .95), aa(sdArch(p, vec2(5.55, 8.2), 1.3, 3.1)));
  c = mix(c, c * mix(vec3(1.), terra * tex * 1.1, .95), aa(length(p - vec2(2.6, 2.5)) - 1.75));
  c = mix(c, c * mix(vec3(1.), rose * tex * 1.1, .9), aa(max(length(p - vec2(8.1, 3.9)) - 1.6, -(length(p - vec2(7.5, 3.9)) - 1.2))));
  c = mix(c, teal * tex, aa(length(p - vec2(6.6, 1.35)) - .5));
  return c;
}
float H(vec2 p){ return .001 * (vn(p * 90.) - .5) + .0012 * fbm(p * 10.); }
void M(vec2 p, inout Mat m){
  vec3 c = hexc(238., 231., 218.) * (.975 + .03 * vn(p * vec2(160., 40.)) * .5 + .03 * vn(p * vec2(40., 170.)) * .5) * (.985 + .03 * fbm(p * 1.5));
  c = shapes(p, c);
  float ink = smoothstep(.013, .007, gridDist(p));
  c = mix(c, hexc(40., 38., 38.) * (.92 + .1 * vn(p * 200.)), ink);
  m.alb = c; m.spec = .12; m.gloss = .1; m.metal = 0.;
}`,
  };
  F.abstract = { glsl: `
float H(vec2 p){ return .0012 * (vn(p * 120., vec2(120.)) - .5); }
void M(vec2 p, inout Mat m){ m.alb = hexc(46., 44., 42.) * (.95 + .08 * vn(p * 240., vec2(240.)) + .04 * fbmP(p * 5., vec2(5.))); m.spec = .1; m.gloss = .1; m.metal = 0.; }` };

  // ================================================================ lux: squares of lapis lazuli and Calacatta marble set in gold
  B.lux = {
    ao: '.03', aok: '4.',
    glsl: MARBLE + `
const float GL = .026;
bool isLapis(vec2 p){ vec2 c = floor(p); return mod(c.x + c.y, 2.) > .5; }
float goldD(vec2 p){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return min(gridDist(p), abs(k - .07)); }
float H(vec2 p){
  float h = .0005 * (vn(p * 30.) - .5);
  float g = goldD(p);
  h += .009 * sqrt(clamp(1. - (g / GL) * (g / GL), 0., 1.));
  h -= .002 * smoothstep(GL + .01, GL + .002, g) * (1. - smoothstep(GL, GL - .004, g));   // the fine joint beside the inlay
  h += edgeRound(p, .05);
  return h;
}
void M(vec2 p, inout Mat m){
  vec3 c;
  if (isLapis(p)) {
    vec2 q = p + 17. * floor(p);
    float f = fbm(q * 1.6), f2 = fbm(q * 4. + 3.);
    c = mix(hexc(14., 24., 86.), hexc(34., 58., 150.), smoothstep(.25, .8, f));
    c = mix(c, hexc(8., 14., 54.), smoothstep(.5, .8, f2) * .6);
    c = mix(c, hexc(60., 92., 190.), smoothstep(.62, .85, fbm(q * 7. + 1.)) * .35);
    c = mix(c, hexc(170., 180., 206.), (1. - smoothstep(.0, .02, abs(fbm(q * .9 + 8.) - .5))) * smoothstep(.5, .7, fbm(q * 1.3 + 2.)) * .45);   // calcite
    float py = smoothstep(.09, .02, cell2(q * 38.)) * step(.62, h21(floor(q * 38.))) * smoothstep(.35, .65, fbm(q * 2. + 6.));                              // pyrite flecks
    m.alb = mix(c, hexc(255., 214., 120.), py); m.metal = py; m.spec = .5 + py; m.gloss = .9;
  } else {
    vec2 q = p + 31. * floor(p);
    float v = marbleV(q * 1.6), v2 = 1. - smoothstep(.0, .012, abs(fbm(q * 1.1 + vec2(fbm(q * .8), 0.) * 1.5) - .5));
    c = mix(hexc(244., 240., 232.), hexc(226., 220., 208.), fbm(q * 1.2));
    c = mix(c, hexc(160., 146., 120.), v * .6);
    float v3 = 1. - smoothstep(.0, .05, abs(fbm(q * 1.1 + vec2(fbm(q * .8), 0.) * 1.5) - .5));
    c = mix(c, hexc(196., 172., 128.), v3 * .25);
    c = mix(c, hexc(172., 146., 100.), v2 * .4);   // the golden veins of Calacatta
    m.alb = c; m.spec = .4; m.gloss = .93; m.metal = 0.;
  }
  float g = goldD(p);
  float gk = smoothstep(GL + .003, GL - .003, g);
  if (gk > 0.) { vec3 gold = hexc(255., 214., 140.) * (.95 + .08 * vn(p * vec2(4., 220.))); m.alb = mix(m.alb, gold, gk); m.metal = max(m.metal, gk); m.gloss = mix(m.gloss, .84, gk); m.spec = mix(m.spec, 1., gk); }
  m.ao *= 1. - .5 * smoothstep(GL + .01, GL + .002, g) * (1. - gk);
}
vec3 POST(vec2 p, vec3 c, Mat m, vec3 n){
  float w = exp(-pow((p.x * .8 + p.y * .6 - 2.5) / 1., 2.)) * .05 + exp(-pow((p.x * .8 + p.y * .6 - 3.9) / .28, 2.)) * .025;
  return c + vec3(w) * (1. - m.metal) * vec3(.95, .97, 1.);
}`,
  };
  F.lux = { glsl: FWOOD + `
float H(vec2 p){ return .0008 * (vn(p * vec2(4., 160.), vec2(4., 160.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(72., 34., 26.), hexc(22., 8., 6.), 13., 6., rt);
  m.alb = c; m.spec = .9; m.gloss = .9; m.metal = 0.; }` };

  // ================================================================ mosaic: a Roman floor in opus tessellatum — limestone tesserae, the grid
  // laid in black, a red tessera where the lines cross, a black border row
  const TESS = `
// p in tessera units; returns vec4(colour id 0..1 random, distance inside the tessera (negative = grout), cell centre)
vec4 tess(vec2 p){
  vec2 i = floor(p + .5), f = p - i;
  vec2 j = (h22(i) - .5) * .08; float rt = (h21(i + 7.) - .5) * .18;
  vec2 q = mat2(cos(rt), -sin(rt), sin(rt), cos(rt)) * (f - j);
  float hs = .41 + .04 * h21(i + 3.);
  float d = sdBox(q, vec2(0.), vec2(hs - .07)) - .07 - .012 * (vn(p * 12.) - .5);
  return vec4(h21(i), d, i);
}`;
  B.mosaic = {
    ao: '.04', aok: '5.',
    glsl: TESS + `
const float NT = 7.;   // tesserae per cell
float H(vec2 p){
  vec4 t = tess(p * NT);
  float h = t.y < 0. ? .012 * smoothstep(0., -.08, t.y) + .002 * (vn(p * 60.) - .5) : -.002;
  h += .0015 * (fbm(p * .7) - .5);
  return h + edgeRound(p, .04);
}
void M(vec2 p, inout Mat m){
  vec4 t = tess(p * NT); vec2 i = t.zw;
  float r = t.x, wear = vn(p * 30.);
  bool line = (mod(i.x, NT) == 0. && i.x > 0. && i.x < 8. * NT) || (mod(i.y, NT) == 0. && i.y > 0. && i.y < 8. * NT);
  bool cross = mod(i.x, NT) == 0. && mod(i.y, NT) == 0. && i.x > 0. && i.x < 8. * NT && i.y > 0. && i.y < 8. * NT;
  bool edge = i.x <= 0. || i.y <= 0. || i.x >= 8. * NT || i.y >= 8. * NT;
  vec3 c;
  if (cross) c = mix(hexc(150., 52., 36.), hexc(182., 74., 50.), r);
  else if (line || edge) c = mix(hexc(34., 32., 32.), hexc(62., 58., 54.), r);
  else c = mix(hexc(226., 216., 196.), hexc(240., 234., 220.), r) * mix(vec3(1.), vec3(1., .96, .9), step(.86, h21(i + 11.)));
  c *= .93 + .1 * vn(p * NT * 3. + i);
  float grout = smoothstep(-.01, .02, t.y);
  c = mix(c, hexc(168., 156., 136.) * (.9 + .15 * vn(p * 200.)), grout);
  m.alb = c; m.spec = .35; m.gloss = .45 - .2 * grout + .1 * wear; m.metal = 0.;
}`,
  };
  F.mosaic = { glsl: TESS + `
// a border of black and red tesserae, 6 per tile (seamless: the hashes wrap)
vec4 tessP(vec2 p){ vec4 t = tess(p); return t; }
float H(vec2 p){ vec4 t = tess(p * 6.); return t.y < 0. ? .01 * smoothstep(0., -.08, t.y) : -.002; }
void M(vec2 p, inout Mat m){
  vec4 t = tess(p * 6.); vec2 i = mod(t.zw, 6.);
  float r = h21(i + 5.);
  vec3 c = mix(hexc(40., 36., 34.), hexc(64., 58., 52.), r);
  if (h21(i + 9.) > .8) c = mix(hexc(140., 48., 34.), hexc(170., 68., 46.), r);
  c = mix(c, hexc(150., 140., 122.), smoothstep(-.01, .02, t.y));
  m.alb = c; m.spec = .3; m.gloss = .4; m.metal = 0.; }` };

  // ================================================================ pompeii: a wall panel in Pompeian red — fresco on lime plaster, polished
  // as the Romans did, the grid painted with a brush in black, a fine ochre line inside the edge, fine craquelure and a few losses
  B.pompeii = {
    ao: '.04', aok: '5.',
    glsl: `
float crk(vec2 p){ vec2 q = p * 4.5 + vec2(fbm(p * 1.5), fbm(p * 1.5 + 7.)) * .5; vec2 i = floor(q), f = fract(q); float d1 = 9., d2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return (d2 - d1); }
float brush(vec2 p){
  vec3 gi = gridInfo(p);
  float off = .006 * (fbm(vec2(gi.z * 1.6, gi.y * 4.)) - .5);
  float x = abs((gi.y < 10. ? p.x - gi.y : p.y - (gi.y - 10.)) - off);
  float w = .019 + .004 * (fbm(vec2(gi.z * 3., gi.y)) - .5);
  float k = smoothstep(w + .004, w - .004, x);
  return k * (.82 + .25 * vn(vec2(gi.z * 30., x * 400.)));   // the bristles drag along the stroke
}
float ochre(vec2 p){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return smoothstep(.012, .006, abs(k - .1)); }
float loss(vec2 p){ return smoothstep(.68, .71, fbm(p * 1.3 + 33.)) * smoothstep(.3, .5, 1. - min(min(p.x, p.y), min(8. - p.x, 8. - p.y)) / 1.2); }
float H(vec2 p){
  float h = .0015 * (fbm(p * 5.) - .5) + .0008 * (vn(p * 120.) - .5);
  h -= .002 * smoothstep(.035, .0, crk(p)) * smoothstep(.45, .7, fbm(p * .7 + 3.));
  h -= .006 * loss(p);
  h += .0012 * brush(p);
  return h + edgeRound(p, .05);
}
void M(vec2 p, inout Mat m){
  vec3 c = mix(hexc(128., 26., 20.), hexc(158., 40., 28.), smoothstep(.25, .8, fbm(p * .6)));
  c = mix(c, hexc(126., 26., 22.), smoothstep(.55, .85, fbm(p * 2.4 + 8.)) * .4);
  c *= .92 + .12 * fbm(p * 22.);
  c *= .95 + .07 * vn(p * 180.);
  float ck = smoothstep(.03, .0, crk(p)) * smoothstep(.45, .7, fbm(p * .7 + 3.));
  c = mix(c, hexc(84., 18., 14.), ck * .35);
  c = mix(c, hexc(214., 160., 64.) * (.9 + .15 * vn(p * 160.)), ochre(p) * .95);
  float b = brush(p);
  c = mix(c, hexc(22., 16., 14.) * (.9 + .2 * vn(p * 90.)), b);
  float ls = loss(p);
  c = mix(c, hexc(222., 206., 180.) * (.85 + .2 * fbm(p * 30.)), ls);   // where the paint has flaked: the lime plaster
  m.alb = c; m.spec = .35; m.gloss = .42 - ls * .35; m.metal = 0.;
}`,
  };
  F.pompeii = { glsl: `
float H(vec2 p){ return .0015 * (fbmP(p * 6., vec2(6.)) - .5) + .0008 * (vn(p * 140., vec2(140.)) - .5); }
void M(vec2 p, inout Mat m){
  vec3 c = mix(hexc(22., 20., 20.), hexc(36., 32., 30.), smoothstep(.3, .7, fbmP(p * 3., vec2(3.))));
  c *= .94 + .1 * vn(p * 200., vec2(200.));
  m.alb = c; m.spec = .3; m.gloss = .35; m.metal = 0.; }` };

  const MAT = `struct Mat { vec3 alb; float spec; float gloss; float metal; float ao; };\n`;
  window.ART_BOARDS = function (kind, key) {
    const post = g => /vec3 POST\(/.test(g) ? g : g + `\nvec3 POST(vec2 p, vec3 c, Mat m, vec3 n){ return c; }\n`;
    if (kind === 'frame') {
      const f = F[key];
      return { glsl: `const float SCALE = 1.; const float AOK = ${f.aok || '0.'};\n` + MAT + FRAME_FINISH + post(f.glsl) + TEMPLATE(f.ao), tex: f.tex, aa: 2 };
    }
    const b = B[key];
    return { glsl: `const float SCALE = 8.; const float AOK = ${b.aok || '4.'};\n` + MAT + BOARD_FINISH + post(b.glsl) + TEMPLATE(b.ao), tex: b.tex, aa: b.aa || 2 };
  };
})();
