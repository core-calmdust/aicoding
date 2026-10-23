// Animated frame effects rendered with a WebGL fragment shader (one shared GL canvas, copied into a 2D canvas
// per frame), for a smooth, continuous "After Effects" look:
//   SR  : violet fire burning around the frame (domain-warped fbm noise scrolling upward, always lit)
//   SSR : gold — light running along the frame line, soft halo, twinkling star glints with long tapered streaks
//   UR  : rainbow fire + white glints
// ~30fps, only frames that are on screen, nothing in html.lite.
(function (root) {
'use strict';
const PAD = 64;
const items = new Set();
let running = false, last = 0, GL = null;

const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS = `
precision highp float;
uniform vec2 uSize, uRect;
uniform float uPad, uT, uR, uMode, uSeed, uS;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21)+uSeed);p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec3 hsv(float h,float s,float v){vec3 k=clamp(abs(mod(h*6.+vec3(0,4,2),6.)-3.)-1.,0.,1.);return v*mix(vec3(1),k,s);}
float glint(vec2 d,float s){
  float core=exp(-dot(d,d)/(s*s*.12));
  float hx=exp(-abs(d.y)/(.6*uS))*exp(-abs(d.x)/(s*2.2));
  float hy=exp(-abs(d.x)/(.6*uS))*exp(-abs(d.y)/(s*1.2));
  float dg=exp(-abs(d.x+d.y)*.7/(.6*uS))*exp(-length(d)/(s*.6))+exp(-abs(d.x-d.y)*.7/(.6*uS))*exp(-length(d)/(s*.6));
  float bl=exp(-length(d)/(s*.5))*.35;
  return core*1.2+hx*.9+hy*.65+dg*.3+bl;
}
void main(){
  vec2 fc=vec2(gl_FragCoord.x,uSize.y-gl_FragCoord.y);
  vec2 q=(fc-uPad-uRect*.5)/uS;            // css px, centre-relative, y down
  vec2 R=uRect*.5/uS;
  float d=sdBox(q,R,uR);                    // >0 outside the frame
  vec3 col=vec3(0.);float al=0.;
  if(uMode<.5||uMode>1.5){
    float top=clamp(-q.y/R.y,-1.,1.);
    float H=mix(10.,13.,smoothstep(-.85,.95,top));
    // vertically stretched, warped noise = flame tongues rising
    vec2 np=vec2(q.x*.075,q.y*.03+uT*1.9);
    vec2 w=vec2(fbm(np*vec2(.7,1.)+vec2(0.,uT*.35)),fbm(np*vec2(.7,1.)+vec2(5.2,uT*.35)));
    float n=fbm(np+w*vec2(.9,1.4));
    n=clamp((n-.25)*1.6,0.,1.);
    float f=clamp(1.-max(d,0.)/(H*(.3+1.7*pow(n,1.4))),0.,1.);
    f*=smoothstep(-6.,0.,d);
    vec3 deep,mid,hot;
    if(uMode<.5){deep=vec3(.3,.05,.75);mid=vec3(.62,.28,1.);hot=vec3(.92,.76,1.);}
    else{float hu=fract(atan(q.y,q.x)/6.2832+uT*.08);deep=hsv(hu,.95,.75);mid=hsv(hu+.05,.8,1.);hot=hsv(hu+.1,.3,1.);}
    vec3 c=mix(deep,mid,smoothstep(.12,.42,f));
    c=mix(c,hot,smoothstep(.5,.78,f));
    c=mix(c,vec3(1.),smoothstep(.85,1.,f)*.3);
    float a=smoothstep(0.,.22,f)*(.16+.34*smoothstep(0.,.7,f));
    float halo=exp(-max(d,0.)/12.)*.1*smoothstep(-6.,0.,d);
    col+=c*a+mid*halo; al=max(al,clamp(a+halo,0.,1.));
  }
  if(uMode>.5){
    vec3 g1=uMode<1.5?vec3(1.,.8,.36):vec3(1.,.92,1.);
    float halo=exp(-max(d,0.)/12.)*.26*smoothstep(-4.,0.,d);
    float ang=atan(q.y,q.x);
    float run=pow(.5+.5*sin(ang*2.-uT*2.4),22.)+pow(.5+.5*sin(-ang*3.+uT*1.7+1.7),28.)*.7;
    float line=exp(-abs(d)/1.8)*(.3+1.7*run);
    float glow=exp(-max(d,0.)/9.)*run*.45*smoothstep(-4.,0.,d);
    col+=g1*(halo+line*.9+glow); al=max(al,clamp(halo+line*.8+glow,0.,1.));
    float cs=24.;
    vec2 cell=floor(q/cs);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
      vec2 c=cell+vec2(float(i),float(j));
      float h=h21(c);
      if(h<.3)continue;
      vec2 pos=(c+vec2(h21(c+3.1),h21(c+7.7)))*cs;
      float pd=sdBox(pos,R,uR);
      if(pd>12.||pd<-5.)continue;
      float ph=h21(c+11.3)*6.2832,rate=1.1+h21(c+5.5)*2.;
      float tw=pow(max(0.,sin(uT*rate+ph)),5.);
      float s=6.+h*11.;
      float g=glint(q-pos,s)*tw;
      vec3 gc=uMode<1.5?vec3(1.,.93,.72):vec3(1.);
      col+=gc*g; al=max(al,min(1.,g));
    }
  }
  gl_FragColor=vec4(min(col,vec3(1.)),clamp(al,0.,1.));
}`;

function initGL() {
  if (GL !== null) return GL;
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true, antialias: false });
  if (!gl) return (GL = false);
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return (GL = false);
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return (GL = false);
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  GL = { cv, gl, u: { size: U('uSize'), rect: U('uRect'), pad: U('uPad'), t: U('uT'), r: U('uR'), mode: U('uMode'), seed: U('uSeed'), s: U('uS') } };
  return GL;
}

const MODE = { SR: 0, SSR: 1, UR: 2 };
function attach(el, rarity) {
  if (!(rarity in MODE) || !el) return;
  for (const it of items) if (it.el === el) { if (it.r === rarity && it.cv.parentNode === el) return; detach(el); }
  if (!initGL()) return;
  const cv = document.createElement('canvas'); cv.className = 'ffx';
  el.appendChild(cv);
  items.add({ el, cv, ctx: cv.getContext('2d'), r: rarity, seed: Math.random() * 10 });
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function detach(el) { for (const it of items) if (it.el === el) { it.cv.remove(); items.delete(it); } }

function render(it, t) {
  const w = it.el.clientWidth, h = it.el.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = Math.round((w + PAD * 2) * dpr), H = Math.round((h + PAD * 2) * dpr);
  if (it.cv.width !== W || it.cv.height !== H) { it.cv.width = W; it.cv.height = H; }
  const { cv, gl, u } = GL;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(u.size, W, H);
  gl.uniform2f(u.rect, w * dpr, h * dpr);
  gl.uniform1f(u.pad, PAD * dpr);
  gl.uniform1f(u.s, dpr);
  gl.uniform1f(u.t, t);
  gl.uniform1f(u.r, Math.min(18, w * .07));
  gl.uniform1f(u.mode, MODE[it.r]);
  gl.uniform1f(u.seed, it.seed);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  it.ctx.clearRect(0, 0, W, H);
  it.ctx.drawImage(cv, 0, 0);
}

function loop(now) {
  if (!items.size) { running = false; return; }
  requestAnimationFrame(loop);
  if (now - last < 33) return;
  last = now;
  if (document.hidden || document.documentElement.classList.contains('lite')) return;
  const t = now / 1000;
  for (const it of [...items]) {
    if (!it.el.isConnected) { items.delete(it); continue; }
    if (!it.el.offsetParent) continue;
    const r = it.el.getBoundingClientRect();
    if (r.bottom < -PAD || r.top > innerHeight + PAD || r.right < -PAD || r.left > innerWidth + PAD) continue;
    render(it, t);
  }
}

root.FrameFX = { attach, detach, scan(rootEl) {
  (rootEl || document).querySelectorAll('.pimg.frame, .ch-art.frame, .gc.frame, .ag-art.frame').forEach(el => {
    const m = /fr-(SR|SSR|UR)\b/.exec(el.className);
    if (m) attach(el, m[1]); else detach(el);
  });
} };
})(window);
