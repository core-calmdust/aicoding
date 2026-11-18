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
  ring += .18 * vn(q * vec2(1.5, 46.) + seed) + .08 * vn(q * vec2(4., 160.));   // the fibres break up each ring's edge
  float t = fract(ring); ringT = t;
  float late = smoothstep(.35, .92, t) * (1. - smoothstep(.93, 1., t));
  vec3 c = mix(early, lateC, late * .55);
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
    ao: '.08', aok: '9.',
    glsl: `
// excavated limestone: eroded and pitted, crumbly grain, cracks, chipped grooves worn round, soil in every hollow
float wob(vec3 gi){ return .05 * (fbm(vec2(gi.z * .9, gi.y * 7.1)) - .5) + .014 * (gn(vec2(gi.z * 9., gi.y * 3.)) - .5); }
float gw(vec3 gi){ return .06 + .05 * (fbm(vec2(gi.z * 1.7, gi.y * 5.)) - .5) + .02 * (gn(vec2(gi.z * 6., gi.y)) - .5); }
float gdist(vec2 p, out float w){ vec3 gi = gridInfo(p); w = gw(gi); return abs((gi.y < 10. ? p.x - gi.y : p.y - (gi.y - 10.)) - wob(gi)); }
float crack(vec2 p){   // a few long cracks through the slab
  vec2 q = p * .55 + vec2(fbm(p * .6), fbm(p * .6 + 9.)) * .9; vec2 i = floor(q), f = fract(q); float d1 = 9., d2 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g); float d = length(g + o - f); if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return (d2 - d1) / .55 + .02 * (gn(p * 20.) - .5);
}
float crackK(vec2 p){ float w = .006 + .016 * fbm(p * 1.3 + 2.); return smoothstep(w, w * .15, crack(p)) * smoothstep(.5, .66, fbm(p * .5 + 13.)); }
float erode(vec2 p){ return fbm(p * 1.3 + vec2(fbm(p * .7), fbm(p * .7 + 4.)) * 1.5); }   // where the surface has crumbled away
vec2 vor(vec2 q){ vec2 i = floor(q), f = fract(q); float d = 9.; vec2 id = vec2(0.); for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g); float e = length(g + o - f); if (e < d){ d = e; id = i + g; } } return vec2(d, h21(id)); }
float pits(vec2 p){ float k = 0.; float reg = smoothstep(.35, .7, fbm(p * .8 + 21.)); for (int i = 0; i < 3; i++){ float sc = 2.8 + float(i) * 4.; vec2 q = p * sc + float(i) * 17.; vec2 v = vor(q); float r = .1 + .18 * fract(v.y * 7.3); float dd = v.x + .22 * (gn(q * 1.7) - .5) + .08 * (gn(q * 5.) - .5); k = max(k, smoothstep(r, r * .2, dd) * step(.975 - reg * .14, v.y)); } return k; }
float H(vec2 p){
  float er = erode(p);
  float h = .06 * (er - .5) - .035 * smoothstep(.5, .72, er) + .03 * (fbm(p * .35) - .5);
  float rough = .6 + 1.2 * smoothstep(.45, .7, er);
  h += rough * (.022 * (fbm(p * 4.) - .5) + .014 * (fbm(p * 14.) - .5) + .007 * (gn(p * 50.) - .5) + .004 * (gn(p * 120.) - .5));
  h -= .045 * pits(p);
  float w; float d = gdist(p, w);
  float worn = .7 + .6 * fbm(p * 2.);
  h -= .03 * worn * smoothstep(w, w * .05, d + .01 * (gn(p * 30.) - .5)) * (1. - .5 * smoothstep(.6, .8, er));
  h -= .03 * crackK(p);
  float ch = smoothstep(.58, .75, fbm(p * 6. + 4.)) * smoothstep(w * 2.4, w * .9, d);
  h -= .018 * ch * (.6 + .8 * gn(p * 30.));
  // the edges of the slab are broken and rounded
  vec2 e2 = min(p, 8. - p); float k = min(e2.x, e2.y) + .2 * (fbm(p * 2.2) - .5);
  h -= .06 * smoothstep(.2, .0, k);
  return h;
}
void M(vec2 p, inout Mat m){
  float er = erode(p);
  vec3 c = mix(hexc(206., 170., 116.), hexc(146., 104., 62.), smoothstep(.25, .8, fbm(p * .45 + 3.)));
  c = mix(c, hexc(222., 192., 140.), smoothstep(.55, .8, fbm(p * 1.1 + 30.)) * .55);
  c = mix(c, hexc(104., 70., 40.), smoothstep(.52, .78, fbm(p * .9 + 44.)) * .75);       // brown blotches
  c = mix(c, hexc(74., 52., 34.), smoothstep(.6, .82, fbm(p * 2.3 + 61.)) * .55);
  c = mix(c, hexc(232., 206., 160.), smoothstep(.6, .8, fbm(p * 1.7 + 90.)) * .45);   // pale worn patches
  c = mix(c, hexc(128., 122., 104.), smoothstep(.62, .82, fbm(p * 1.2 + 77.)) * .35);  // grey lime crust
  c *= .74 + .46 * fbm(p * 6.);
  c *= .88 + .2 * gn(p * 80.) * (.5 + smoothstep(.45, .7, er));
  c = mix(c, hexc(92., 64., 40.), smoothstep(.55, .78, er) * .55);                    // crumbled hollows, darker
  c = mix(c, hexc(96., 68., 42.), pits(p) * .45);
  c = mix(c, hexc(60., 44., 30.), smoothstep(.2, .02, cell2(p * 30.)) * step(.93 - .2 * smoothstep(.5, .8, fbm(p * .7 + 8.)), h21(floor(p * 30.))) * .45);   // dark specks
  c = mix(c, hexc(84., 74., 58.), smoothstep(.66, .82, fbm(p * 1.6 + 70.)) * .5);   // grey-brown staining
  c = mix(c, hexc(222., 196., 150.), smoothstep(.72, .9, fbm(p * 2.4 + 50.)) * .35); // salt bloom
  float w; float d = gdist(p, w);
  c = mix(c, hexc(78., 56., 36.) * (.8 + .4 * fbm(p * 40.)), smoothstep(w * 1.1, w * .2, d) * (.55 + .3 * fbm(p * 3.)));   // soil in the grooves
  c = mix(c, hexc(70., 50., 34.), crackK(p) * .55);
  vec2 e2 = min(p, 8. - p); float k = min(e2.x, e2.y) + .12 * (fbm(p * 3.) - .5);
  c *= 1. - .35 * smoothstep(.2, .0, k);
  m.alb = c; m.spec = .18; m.gloss = .12; m.metal = 0.;
}
vec3 POST(vec2 p, vec3 c, Mat m, vec3 n){ return c * (1. - .22 * smoothstep(2.6, 6.2, length(p - vec2(3.6, 3.4)))); }`,
  };
  F.stone = { glsl: `
float H(vec2 p){ return .01 * (fbmP(p * 3., vec2(3.)) - .5) + .006 * (fbmP(p * 9., vec2(9.)) - .5) + .003 * (vn(p * 70., vec2(70.)) - .5); }
void M(vec2 p, inout Mat m){
  vec3 c = mix(hexc(110., 82., 52.), hexc(150., 116., 76.), smoothstep(.3, .7, fbmP(p * 3., vec2(3.))));
  c *= .8 + .35 * fbmP(p * 12., vec2(12.));
  c *= .88 + .2 * vn(p * 90., vec2(90.));
  c = mix(c, hexc(58., 42., 28.), smoothstep(.7, .9, vn(p * 40., vec2(40.))) * .5);
  m.alb = c; m.spec = .15; m.gloss = .1; m.metal = 0.; }` };

  // ================================================================ wood: a birch plywood board, the grid burnt in with a laser (a modern
  // workshop's take on the game), a double border line burnt round the edge
  B.wood = {
    ao: '.04', aok: '4.',
    glsl: WOOD + `
// a cabinet-maker's board: two bookmatched planks of walnut (the joint hidden under the middle line), French-polished, the grid
// inlaid with boxwood stringing in fine routed channels, a stringing line round the very edge
float sw(float d, float w){ return smoothstep(w + .003, w - .003, d); }
float edgeD(vec2 p){ vec2 d = min(p, 8. - p); return abs(min(d.x, d.y) - .03); }
float H(vec2 p){
  float h = .0008 * (vn(p * vec2(2., 60.)) - .5) + .002 * (fbm(p * .4) - .5);
  float d = min(gridDist(p), edgeD(p));
  h -= .0035 * smoothstep(.024, .019, d) * (1. - sw(d, .016));   // the hairline joint round the stringing
  h += .0012 * sw(d, .016);
  h += edgeRound(p, .05);
  return h;
}
void M(vec2 p, inout Mat m){
  // two bookmatched planks of black walnut, the cathedral figure mirrored about the middle line
  float rt;
  vec2 q = vec2(p.y, abs(p.x - 4.));
  vec3 c = woodCol(vec2(q.x * .6 + 1.3, q.y * 1.05 - 3.1 + .5 * fbm(p * .15)), 7.1, hexc(110., 70., 42.), hexc(64., 38., 22.), .2, vec2(0.), rt);
  c = mix(c, hexc(52., 30., 20.), smoothstep(.45, .8, fbm(vec2(q.x * .35, q.y * 2.4) + 3.)) * .45);    // dark streaks along the grain
  c = mix(c, hexc(146., 98., 58.), smoothstep(.58, .86, fbm(vec2(q.x * .3, q.y * 1.8) + 13.)) * .3);   // paler heart streaks
  c = mix(c, c * vec3(.92, .86, .9), smoothstep(.4, .7, fbm(p * .3 + 70.)) * .5);                        // walnut's purple cast
  c *= .92 + .1 * vn(vec2(q.x * 3., q.y * 90.));
  float cen = length(p - 4.) / 4.; c *= .97 + .06 * cen;
  float d = min(gridDist(p), edgeD(p));
  float s1 = sw(d, .019), s0 = sw(d, .0095);
  vec3 box = mix(hexc(238., 222., 184.), hexc(220., 200., 156.), vn(p * vec2(30., 2.) + 3.)) * (.94 + .08 * vn(p * 160.));
  c = mix(c, hexc(30., 18., 10.), smoothstep(.024, .019, d) * (1. - s1) * .8);
  c = mix(c, hexc(22., 16., 14.) * (.9 + .2 * vn(p * 200.)), s1);     // ebony
  c = mix(c, box, s0);                                                  // boxwood
  m.alb = c; m.spec = .9; m.gloss = .8 - s1 * .2; m.metal = 0.;
}
vec3 POST(vec2 p, vec3 c, Mat m, vec3 n){
  float w = exp(-pow((p.x * .75 + p.y * .65 - 3.) / 1.3, 2.)) * .06;   // the polish catches a window
  return c + vec3(w) * vec3(1., .96, .9);
}`,
  };
  F.wood = { glsl: FWOOD + `
float H(vec2 p){ return .0012 * (vn(p * vec2(4., 120.), vec2(4., 120.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(84., 48., 26.), hexc(38., 20., 10.), 9., 2., rt);
  m.alb = c; m.spec = .8; m.gloss = .7; m.metal = 0.; }` };

  // ================================================================ abstract: a matte plaster sheet with large flat shapes in Roman colours —
  // an arch, the sun, a half moon — printed over each other; the grid a fine charcoal line
  B.abstract = {
    ao: '.03', aok: '2.',
    glsl: `
// a colour-field painting: oil on linen canvas — soft-edged fields of deep teal, slate blue and a smoulder of plum, laid in with
// broad brush strokes that show; the grid drawn over it in thin, slightly broken chalk-white lines
float weave(vec2 p){ vec2 q = p * 120.; float a = sin(q.x * 3.1416) * .5 + .5, b = sin(q.y * 3.1416) * .5 + .5; return mix(a, b, step(.5, fract(floor(q.x) * .5 + floor(q.y) * .5))); }
float stroke(vec2 p, float ang, float sc){ vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p; return vn(q * vec2(sc * .25, sc * 6.)) * .6 + vn(q * vec2(sc * .5, sc * 14.) + 3.) * .4; }
float field(vec2 p, vec2 c, vec2 h, float soft){ vec2 w = vec2(fbm(p * 1.7 + c), fbm(p * 1.7 + c + 9.)) * .35; return smoothstep(soft, -soft, sdBox(p + w - .17, c, h)); }
float H(vec2 p){
  float h = .0012 * (weave(p) - .5);
  h += .0035 * (stroke(p, .08, 2.5) - .5) + .002 * (stroke(p, 1.6, 4.) - .5);
  return h;
}
void M(vec2 p, inout Mat m){
  vec3 bg = mix(hexc(18., 46., 52.), hexc(26., 62., 66.), stroke(p, .05, 1.6));
  vec3 c = bg;
  float f1 = field(p, vec2(4., 2.15), vec2(3.35, 1.45), .38), f2 = field(p, vec2(4., 5.55), vec2(3.35, 1.55), .42), f3 = field(p, vec2(4., 3.9), vec2(3.2, .22), .2);
  vec3 c1 = mix(hexc(54., 108., 110.), hexc(76., 132., 128.), stroke(p, .1, 2.2));
  vec3 c2 = mix(hexc(44., 62., 98.), hexc(62., 82., 120.), stroke(p, -.06, 2.));
  vec3 c3 = mix(hexc(122., 58., 74.), hexc(150., 78., 88.), stroke(p, .0, 3.));
  c = mix(c, c1, f1 * (.85 + .15 * stroke(p, .1, 5.)));
  c = mix(c, c2, f2 * (.85 + .15 * stroke(p, -.05, 5.)));
  c = mix(c, c3, f3 * .9);
  c *= .93 + .1 * stroke(p, .3, 7.);
  c *= .95 + .08 * weave(p);
  vec3 gi = gridInfo(p);
  float wv = .004 * (fbm(vec2(gi.z * 2., gi.y * 3.)) - .5);
  float ld = abs((gi.y < 10. ? p.x - gi.y : p.y - (gi.y - 10.)) - wv);
  float lw = .011 + .003 * (vn(vec2(gi.z * 9., gi.y)) - .5);
  float chalk = smoothstep(lw + .004, lw - .003, ld) * (.55 + .45 * smoothstep(.3, .7, vn(vec2(gi.z * 60., ld * 300.)) + weave(p) * .4));
  c = mix(c, hexc(232., 228., 216.), chalk * .9);
  m.alb = c; m.spec = .25; m.gloss = .25; m.metal = 0.;
}`,
  };
  F.abstract = { glsl: FWOOD + `
float H(vec2 p){ return .001 * (vn(p * vec2(4., 140.), vec2(4., 140.)) - .5); }
void M(vec2 p, inout Mat m){ float rt; vec3 c = fwood(p, hexc(52., 40., 34.), hexc(26., 20., 18.), 10., 8., rt);
  m.alb = c; m.spec = .4; m.gloss = .4; m.metal = 0.; }` };

  // ================================================================ lux: squares of lapis lazuli and Calacatta marble set in gold
  B.lux = {
    ao: '.03', aok: '4.',
    glsl: MARBLE + `
const float GL = .026;
bool isLapis(vec2 p){ vec2 c = floor(p); return mod(c.x + c.y, 2.) > .5; }
float goldD(vec2 p){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return min(gridDist(p), abs(k - .022)); }   // the edge line stays outside the coordinates
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
// opus tessellatum laid large and calm: 4×4 limestone tesserae to a square, the grid a single row of slim dark tesserae, a red one
// where the lines cross; the grout close to the stone's own colour so the floor reads quiet
// returns vec4(random, signed distance inside the tessera, kind (0 field, 1 line, 2 crossing), id hash)
vec4 tile(vec2 p){
  vec2 cell = floor(p), u = p - cell;
  vec3 gi = gridInfo(p);
  float lw = .05;
  vec2 e = min(p, 8. - p); float edge = min(e.x, e.y);
  if (gi.x < lw || edge < lw) {
    bool cross = gridDist(p) < lw && abs(p.x - floor(p.x + .5)) < lw && abs(p.y - floor(p.y + .5)) < lw && edge > lw;
    if (cross) { vec2 q = p - floor(p + .5); float d = sdBox(q, vec2(0.), vec2(lw * .8)) - .006; return vec4(h21(floor(p + .5) + 3.), d, 2., h21(floor(p + .5))); }
    float along = gi.x < lw ? gi.z : (e.x < e.y ? p.y : p.x), acr = gi.x < lw ? gi.x : edge;
    float sl = .14, k = floor(along / sl + .5 * step(.5, fract(gi.y * .5)));
    float f = along / sl + .5 * step(.5, fract(gi.y * .5)) - k - .5;
    float d = max(abs(f) * sl - sl * .5 + .008, acr - lw + .008);
    d += .006 * (vn(p * 40.) - .5);
    return vec4(h21(vec2(k, gi.y)), d, 1., h21(vec2(k, gi.y + 7.)));
  }
  vec2 v = clamp((u - lw) / (1. - 2. * lw), 0., .9999) * 4.;
  vec2 ti = floor(v), f = fract(v) - .5;
  vec2 id = cell * 7. + ti;
  vec2 j = (h22(id) - .5) * .08; float rt = (h21(id + 5.) - .5) * .12;
  vec2 q = mat2(cos(rt), -sin(rt), sin(rt), cos(rt)) * (f - j);
  float hs = .455 + .02 * h21(id + 2.);
  float d = (sdBox(q, vec2(0.), vec2(hs - .08)) - .08) * (1. - 2. * lw) / 4. + .002 * (vn(p * 50.) - .5);
  return vec4(h21(id), d, 0., h21(id + 9.));
}
float H(vec2 p){
  vec4 t = tile(p);
  float h = t.y < 0. ? .01 * smoothstep(0., -.02, t.y) + .003 * (t.w - .5) + .0015 * (vn(p * 50.) - .5) : -.002;
  return h + .002 * (fbm(p * .7) - .5) + edgeRound(p, .04);
}
void M(vec2 p, inout Mat m){
  vec4 t = tile(p);
  float r = t.x;
  vec3 c;
  if (t.z > 1.5) c = mix(hexc(150., 56., 40.), hexc(176., 76., 52.), r);
  else if (t.z > .5) c = mix(hexc(48., 44., 42.), hexc(74., 68., 62.), r);
  else c = mix(hexc(222., 210., 186.), hexc(236., 228., 210.), r) * mix(vec3(1.), vec3(1., .95, .88), step(.8, t.w));
  c *= .94 + .08 * fbm(p * 14. + t.w * 9.);
  c *= .97 + .05 * vn(p * 120.);
  float grout = smoothstep(-.003, .004, t.y);
  c = mix(c, hexc(186., 174., 152.) * (.92 + .1 * vn(p * 200.)), grout);
  c *= .97 + .05 * fbm(p * .6);
  m.alb = c; m.spec = .35; m.gloss = .42 - .2 * grout; m.metal = 0.;
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
float ochre(vec2 p){ vec2 d = min(p, 8. - p); float k = min(d.x, d.y); return smoothstep(.01, .005, abs(k - .022)); }   // outside the coordinates
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
