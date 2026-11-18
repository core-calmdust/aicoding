/* GLSL library for tools/art.html: noise, the board geometry of Fox and Geese (cell units 0..7, y down) and the lighting. */
(function () {
  // the lines of the board, merged into long straight runs (same as E.NBR: orthogonal everywhere, diagonals from the points
  // whose row + column is even)
  const ON = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7 && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
  const edges = new Set(), segs = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (ON(r, c)) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    if (dr && dc && (r + c) % 2) continue;
    if (!ON(r + dr, c + dc)) continue;
    edges.add(`${r},${c},${dr},${dc}`);
  }
  for (const e of [...edges]) {
    if (!edges.has(e)) continue;
    let [r, c, dr, dc] = e.split(',').map(Number);
    while (edges.has(`${r - dr},${c - dc},${dr},${dc}`)) { r -= dr; c -= dc; }   // walk back to the start of the run
    let r1 = r, c1 = c;
    while (edges.has(`${r1},${c1},${dr},${dc}`)) { edges.delete(`${r1},${c1},${dr},${dc}`); r1 += dr; c1 += dc; }
    segs.push([c + .5, r + .5, c1 + .5, r1 + .5]);
  }
  window.ART_SEGS = segs;
  window.ART_LIB = `
#define PI 3.14159265
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h31(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
vec2 h22(vec2 p){ vec3 a = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); a += dot(a, a.yzx + 33.33); return fract((a.xx + a.yz) * a.zy); }
// value noise (period P > 0 wraps: seamless tiles)
float vn(vec2 p, vec2 P){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  vec2 i0 = P.x > 0. ? mod(i, P) : i, i1 = P.x > 0. ? mod(i + 1., P) : i + 1.;
  return mix(mix(h21(i0), h21(vec2(i1.x, i0.y)), u.x), mix(h21(vec2(i0.x, i1.y)), h21(i1), u.x), u.y); }
float vn(vec2 p){ return vn(p, vec2(0.)); }
float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), u.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), u.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), u.x), u.y), u.z); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  vec2 g00 = h22(i) * 2. - 1., g10 = h22(i + vec2(1, 0)) * 2. - 1., g01 = h22(i + vec2(0, 1)) * 2. - 1., g11 = h22(i + vec2(1, 1)) * 2. - 1.;
  float n = mix(mix(dot(g00, f), dot(g10, f - vec2(1, 0)), u.x), mix(dot(g01, f - vec2(0, 1)), dot(g11, f - vec2(1, 1)), u.x), u.y);
  return .5 + n * .75; }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 6; i++){ s += a * gn(p); p = mat2(.8, .6, -.6, .8) * p * 2.03 + 17.1; a *= .5; } return s / .984; }
float fbmV(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float fbmP(vec2 p, vec2 P){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn(p, P); p *= 2.; P *= 2.; a *= .5; } return s; }
float fbm3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vn3(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
// cellular (distance to the nearest feature point), for speckles and pores
float cell2(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 9.; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(x, y); vec2 o = h22(i + g); d = min(d, length(g + o - f)); } return d; }
vec3 hexc(float r, float g, float b){ return pow(vec3(r, g, b) / 255., vec3(2.2)); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
float segT(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); }
// the board (p in cell units, 0..7)
const int NSEG = ${segs.length};
const vec4 SEG[${segs.length}] = vec4[](${segs.map(s => `vec4(${s.map(v => v.toFixed(1)).join(',')})`).join(',')});
float lineDist(vec2 p){ float d = 9.; for (int i = 0; i < NSEG; i++) d = min(d, sdSeg(p, SEG[i].xy, SEG[i].zw)); return d; }
// distance to the nearest line, and which line / where along it (for brush strokes): returns vec3(d, index, t)
vec3 lineInfo(vec2 p){ float d = 9., k = 0., t = 0.; for (int i = 0; i < NSEG; i++){ float e = sdSeg(p, SEG[i].xy, SEG[i].zw); if (e < d){ d = e; k = float(i); t = segT(p, SEG[i].xy, SEG[i].zw) * length(SEG[i].zw - SEG[i].xy); } } return vec3(d, k, t); }
bool onPt(vec2 c){ vec2 rc = floor(c); return rc.x >= 0. && rc.x < 7. && rc.y >= 0. && rc.y < 7. && ((rc.y >= 2. && rc.y <= 4.) || (rc.x >= 2. && rc.x <= 4.)); }
float ptDist(vec2 p){ vec2 c = floor(p) + .5; return onPt(c) ? length(p - c) : 9.; }
float sdBox(vec2 p, vec2 c, vec2 h){ vec2 d = abs(p - c) - h; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
// signed distance to the cross (negative inside); r rounds the outer corners
float sdCross(vec2 p, float r){ return min(sdBox(p, vec2(3.5), vec2(3.5 - r, 1.5 - r)), sdBox(p, vec2(3.5), vec2(1.5 - r, 3.5 - r))) - r; }
// lighting: light from the upper left (y down in the picture), the viewer straight above
const vec3 LDIR = normalize(vec3(-.55, -.62, .78));
vec3 studio(vec3 r){   // a soft studio: a big softbox up-left, a fill down-right, a dim room
  float k = .05 + .5 * pow(clamp(r.z, 0., 1.), 3.);   // the ceiling
  k += 2.2 * exp(-dot(r.xy - vec2(-.42, -.5), r.xy - vec2(-.42, -.5)) / .06);
  k += .5 * exp(-dot(r.xy - vec2(.55, .35), r.xy - vec2(.55, .35)) / .08);
  k += .25 * smoothstep(.2, -.6, r.y) * (1. - r.z);
  return vec3(k) * vec3(1., .98, .95);
}
vec3 studioBlur(vec3 r){ return mix(studio(r), vec3(.34), .55); }
// albedo, normal, specular amount, gloss (0 rough .. 1 mirror), metal, ambient occlusion
vec3 lit(vec3 alb, vec3 n, float spec, float gloss, float metal, float ao){
  vec3 V = vec3(0., 0., 1.), H = normalize(LDIR + V);
  float dif = max(dot(n, LDIR), 0.) * .82 + .3 * (.5 + .5 * n.z);
  vec3 R = reflect(-V, n);
  vec3 env = mix(studioBlur(R), studio(R), gloss);
  float fr = .04 + .96 * pow(1. - max(n.z, 0.), 5.);
  float shin = mix(8., 400., gloss * gloss);
  float sp = pow(max(dot(n, H), 0.), shin) * (shin + 8.) / 60.;
  vec3 dc = alb * dif * ao * (1. - metal);
  vec3 sc = mix(vec3(spec * (fr + .02)), alb, metal) * (env * mix(.6, 1., gloss) + sp) * ao;
  return dc + sc;
}
`;
})();
