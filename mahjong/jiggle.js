// 雀華：ホームのキャラの絵を触ると、触った所が「ぷるん」と震える（ユーザー 2026-11-16）。
// 触っている間だけ、絵を WebGL のキャンバスに描き替え、触った点のまわりを局所的にゆがめる：まず軽く押し込まれ（縮む）、
// はね返って膨らみ、減衰しながら数回揺れて止まる（約0.9秒）。同時に最大4か所。揺れ終わると元の <img> に戻す。
// キャンバスは <img> と同じマスク・影・呼吸のアニメ（位相も合わせる）を持つので、入れ替わりは目に見えない。
(function () {
'use strict';
const VS = 'attribute vec2 p;varying vec2 q;void main(){q=p*.5+.5;q.y=1.-q.y;gl_Position=vec4(p,0.,1.);}';
const FS = `precision highp float;varying vec2 q;uniform sampler2D T;uniform vec2 S;uniform vec2 I;uniform vec4 J[4];uniform vec4 K[4];
void main(){
  float k=max(S.x/I.x,S.y/I.y);vec2 iw=I*k;vec2 px=q*S;
  vec2 uv=vec2((px.x-(S.x-iw.x)*.5)/iw.x,px.y/iw.y);
  vec2 asp=vec2(1.,I.y/I.x);vec2 o=vec2(0.);
  for(int i=0;i<4;i++){ vec4 j=J[i]; if(j.w<=0.)continue;
    vec2 d=(uv-j.xy)*asp; float r=j.z; float f=exp(-dot(d,d)/(r*r));
    // K: x = radial (− pinch / + bulge), y = vertical bounce, z = sideways sway
    o+= -d/asp*f*K[i].x + vec2(K[i].z, K[i].y)*f*r; }
  uv+=o;
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.){gl_FragColor=vec4(0.);return;}
  gl_FragColor=texture2D(T,uv);
}`;
let cv = null, gl = null, prog = null, tex = null, texSrc = '', loc = {}, raf = 0, hits = [], hostImg = null;
function setup() {
  cv = document.createElement('canvas'); cv.className = 'jig';
  gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false }) || cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }); if (!gl) return false;
  const GL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  for (const n of ['T', 'S', 'I', 'J', 'K']) loc[n] = gl.getUniformLocation(prog, n);
  tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.mip = GL2;   // (WebGL 2: mipmaps for a picture drawn much smaller than its file — as sharp as the <img>)
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, GL2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  return true;
}
// the movement of one touch, t seconds after it: a press (pinch), the rebound (bulge) and a few dying wobbles
function shape(t) {
  const e = Math.exp(-t * 4.6), w = 2 * Math.PI * 5.2 * t;
  return [-.30 * Math.cos(w) * e, .045 * Math.sin(w + .6) * e, .02 * Math.sin(w * .5 + 1.1) * e];
}
function draw(now) {
  const img = hostImg; if (!img || !img.isConnected) return stop();
  const W = cv.width, H = cv.height;
  hits = hits.filter(h => now - h.t0 < 1000);
  if (!hits.length) return stop();
  const J = new Float32Array(16), K = new Float32Array(16);
  hits.slice(-4).forEach((h, i) => { const s = shape((now - h.t0) / 1000); J.set([h.u, h.v, h.r, 1], i * 4); K.set([s[0], s[1], s[2], 0], i * 4); });
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1i(loc.T, 0); gl.uniform2f(loc.S, W, H); gl.uniform2f(loc.I, img.naturalWidth || 1080, img.naturalHeight || 1920);
  gl.uniform4fv(loc.J, J); gl.uniform4fv(loc.K, K); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  raf = requestAnimationFrame(draw);
}
function stop() { cancelAnimationFrame(raf); raf = 0; hits = []; if (hostImg) hostImg.style.visibility = ''; if (cv) cv.style.display = 'none'; }
// u, v: the touched point on the picture (0–1 of its own width and height); img: the <img> of the picture
function poke(img, u, v) {
  if (!img || !img.complete || !img.naturalWidth || u < 0 || u > 1 || v < 0 || v > 1) return;
  if (!cv && !setup()) return;
  const host = img.parentNode; if (cv.parentNode !== host) host.appendChild(cv);
  const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(img.offsetWidth * dpr), H = Math.round(img.offsetHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (texSrc !== img.currentSrc) { try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); if (gl.mip) gl.generateMipmap(gl.TEXTURE_2D); texSrc = img.currentSrc; } catch (e) { return; } }
  hostImg = img;
  hits.push({ u, v, r: .085, t0: performance.now() });
  if (!raf) {
    // the canvas takes the picture's place: the same breathing, at the same moment of it
    cv.style.display = 'block';
    try { const a = img.getAnimations()[0], b = cv.getAnimations()[0]; if (a && b) b.currentTime = a.currentTime; } catch (e) {}
    draw(performance.now()); img.style.visibility = 'hidden';
  }
}
window.MJJiggle = { poke };
})();
