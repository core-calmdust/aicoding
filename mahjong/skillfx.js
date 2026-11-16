// 雀華：スキルのエフェクト（ユーザー 2026-11-15：スキルを使うと、キャラの絵と文字のカットインのあとに、卓の上にスキルごとのエフェクトを出す。
// 同日：ベクターっぽい絵はやめ、半透明を使った格好いいものに）。
// Skill effects: after the cut-in each skill plays its own effect over the table. Everything is light and smoke drawn by one
// fragment shader on a canvas laid over the table (as framefx.js does for the frames): noise-driven, soft-edged, layered and
// translucent — no outlines, no flat shapes. The table is dimmed a little under it. Most of it lies ON the table: every pixel is
// mapped to its place on the cloth (a homography from four projected points), in the axes of the seat that used the skill
// (x to her right, y toward her: she sits at y ≈ +8, the far side at −9.5), so the effect has the table's perspective and is
// aimed by itself.
//   wareme 割れ目   : lightning runs the table from the far side to the user, three strikes, a glowing crack left in the cloth
//   hanup  紅蓮の一翻: a wave of fire rolls from the user toward the middle
//   guard  鉄壁     : a dome of force before the user — honeycomb cells lit by a passing pulse
//   shugi  祝儀     : shafts of gold light and a rain of turning coins
//   pot    総取り   : a golden whirlpool over the middle, drawn away into the user
//   doraplus ドラ増し: a burst from the middle — rays, shock rings, star glints
//   lure   引き寄せ : streams of green light are drawn in to the user from all round
//   mind   読心     : an eye opens over the middle; rings of thought spread, its gaze goes out to the three others
//   peek   先読み   : a line of light scans the table away from the user, a grid and a sight left in its wake
//   swap   すり替え : two comets circle each other and change places
//   seal   封じ     : a magic circle, two chains across the table, the seal 封 stamped on them
// MJSkillFx.play(id, seat, tb, { lite }) → a promise, kept when the effect has made its point (it fades out after that).
(function (root) {
'use strict';
const IDS = ['wareme', 'hanup', 'guard', 'shugi', 'pot', 'doraplus', 'lure', 'mind', 'peek', 'swap', 'seal'];
const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS = `
precision highp float;
uniform vec2 uRes, uC, uO1, uO2, uO3;
uniform float uT, uMode, uSeed, uUnit, uScale;
uniform mat3 uH;
uniform sampler2D uGlyph;
float ss(float a,float b,float x){return smoothstep(a,b,x);}
float h11(float n){return fract(sin(n*127.1+uSeed)*43758.5453);}
float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed)*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.02+vec2(3.1,1.7);a*=.5;}return s;}
vec2 hexC(vec2 p){vec2 r=vec2(1.,1.732),h=r*.5,a=mod(p,r)-h,b=mod(p-h,r)-h;return dot(a,a)<dot(b,b)?a:b;}
float hexD(vec2 p){p=abs(p);return max(dot(p,vec2(.5,.866)),p.x);}
float glint(vec2 d,float s){return exp(-dot(d,d)/(s*s*.1))*1.4+exp(-abs(d.y)*9./s)*exp(-abs(d.x)*1.3/s)+exp(-abs(d.x)*9./s)*exp(-abs(d.y)*1.3/s)*.8;}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.));}

vec3 wareme(vec2 q,float t){
  vec3 c=vec3(0.);
  float end=1.-ss(3.5,8.2,q.y), onT=step(-10.5,q.y)*step(q.y,8.7);
  for(int k=0;k<3;k++){
    float fk=float(k),u=(t-fk*.16)/((k==2)?.6:.15);
    if(u<0.||u>1.)continue;
    float sd=fk*5.31,fl=floor(t*30.);
    float off=(fbm(vec2(q.y*.22+sd,sd*1.7))-.5)*9.*end+(vn(vec2(q.y*1.3,sd+fl*.61))-.5)*1.1*end;
    float m=step(q.y,mix(-10.,9.,ss(0.,.12,u)))*onT, a=pow(1.-u,1.6)*(.7+.3*h11(fl+fk)), d=abs(q.x-off);
    c+=m*a*(vec3(.8,.88,1.)*.1/(d+.035)+vec3(.25,.42,1.)*exp(-d*.9)*.75+vec3(.5,.3,1.)*exp(-d*.22)*.2);
    for(int j=0;j<3;j++){ float fj=float(j),zb=mix(-7.,3.,h11(sd+fj*3.1)),sl=(h11(sd+fj*9.7)-.5)*2.6,lz=q.y-zb;
      if(lz>0.&&lz<4.5){ float d2=abs(q.x-(off+lz*sl+(vn(vec2(q.y*2.2,sd+fj+fl*.4))-.5)*.8)); c+=m*a*(1.-lz/4.5)*(vec3(.75,.85,1.)*.04/(d2+.03)+vec3(.25,.4,1.)*exp(-d2*1.6)*.4); } }
    c+=vec3(.3,.4,.9)*.45*(1.-ss(0.,.3,u))*a;
  }
  float off=(fbm(vec2(q.y*.22+10.62,18.054))-.5)*9.*end, d=abs(q.x-off);   // the crack left by the last strike
  c+=onT*ss(.36,.5,t)*(1.-ss(.8,1.,t))*(vec3(.75,.35,1.)*exp(-d*2.6)*(.5+1.3*fbm(q*1.4+vec2(0.,t*3.)))+vec3(1.,.8,1.)*.02/(d+.05));
  return c;
}
vec3 hanup(vec2 q,float t){
  // (ユーザー 2026-11-15: it did not read as fire, and it was dotty.) Flames rooted along the user's edge, their tongues licking toward the
  // middle: a smooth turbulence streams along each tongue, the body is cut by the distance from the root (each column its own
  // length), and the colour runs from deep red at the edges through orange to a white-yellow heart. No speckle.
  float d=8.8-q.y, L=12.*ss(0.,.28,t)*(1.-ss(.55,1.,t))+.01, edge=1.-ss(4.5,8.5,abs(q.x));
  float warp=fbm(vec2(q.x*.45,d*.26-t*3.))-.5;
  float n=fbm(vec2(q.x*.8+warp*1.9,d*.3-t*5.5)), n2=fbm(vec2(q.x*1.7-warp*1.2+7.,d*.55-t*8.));
  float hcol=.5+.95*vn(vec2(q.x*.5+3.,t*2.6)), shape=1.-d/(L*hcol);
  float f=clamp(shape*1.2+(n-.5)*1.7+(n2-.5)*.5,0.,1.)*ss(-.25,.2,shape)*edge*ss(-1.2,.4,d);
  f=pow(f,1.35);
  vec3 c=vec3(1.75,.24,.04)*f+vec3(1.4,.78,.1)*pow(f,2.2)*1.5+vec3(1.,.96,.8)*pow(f,5.)*1.5;
  c+=vec3(1.,.22,.04)*.3*edge*exp(-max(d,0.)*.16)*ss(0.,.2,t)*(1.-ss(.6,1.,t));          // its glow on the cloth
  vec2 g=vec2(q.x*1.1,d*.5-t*7.),id=floor(g); float hh=h21(id);                          // a few soft sparks carried along
  if(hh>.8){ vec2 o=vec2(h21(id+.3),h21(id+.7))*.6+.2-fract(g); c+=vec3(1.6,.9,.3)*exp(-dot(o,o)*90.)*edge*ss(.1,.9,shape+.5)*(1.-ss(.6,1.,t)); }
  return c;
}
vec3 guard(vec2 q,float t){
  vec2 p=q-vec2(0.,8.4); float r=length(p*vec2(1.,1.25)), R=6.6, out_=1.-ss(.72,1.,t);
  float grow=ss(0.,.22,t), inside=(1.-ss(R-.15,R+.1,r))*step(r,R*grow+.01);
  float hd=hexD(hexC(q*.95)), edge=ss(.4,.5,hd), cell=h21(floor(q*.95*vec2(1.,.577)));
  float wave=exp(-pow((r-fract(t*1.5)*R*1.25)*.75,2.)), shell=exp(-pow((r-R*grow)*1.5,2.));
  float shim=fbm(q*.6+vec2(t*1.3,-t*.8));
  vec3 c=vec3(.25,.55,1.)*inside*(.16+.1*shim+edge*(.55+1.6*wave)+wave*.35*(.5+cell))+vec3(.7,.9,1.)*inside*edge*wave*.9;
  c+=vec3(.45,.75,1.)*shell*(1.1+.6*shim)+vec3(.3,.6,1.)*.25*exp(-r*.3)*grow;
  c+=vec3(.8,.92,1.)*exp(-r*r*.05)*(1.-ss(0.,.25,t))*1.2;
  return c*out_;
}
vec3 shugi(vec2 p,float t){
  float area=1.-ss(7.5,13.,length(p*vec2(.75,1.15))), env=ss(0.,.12,t)*(1.-ss(.78,1.,t));
  float sh=pow(fbm(vec2((p.x+p.y*.18)*.42,t*.7)),2.2)*ss(9.,-7.,p.y);
  vec3 c=vec3(1.,.74,.25)*sh*1.5;
  c+=vec3(1.,.8,.35)*.16*exp(-dot(p,p)*.012);
  for(int L=0;L<3;L++){ float fl=float(L),sc=mix(1.05,.5,fl*.5),soft=mix(.1,.4,fl*.5); vec2 g=p*sc+vec2(fl*3.7,0.);
    float cx=floor(g.x),hx=h11(cx*1.37+fl*11.3),yy=g.y-t*(13.+hx*12.)+hx*23.,cy=floor(yy/5.),hc=h21(vec2(cx,cy)+fl*7.);
    if(hc<.42)continue;
    float fy=mod(yy,5.)-2.5,fx=fract(g.x)-.5+(hc-.7)*.3,w=abs(cos(hc*40.+t*(9.+hc*12.)));
    float d=length(vec2(fx/(.07+.3*w),fy/.37));
    float disc=1.-ss(1.-soft,1.+soft*.4,d), rim=ss(.5,.7,d)*(1.-ss(.8,.95,d));
    c+=(vec3(1.,.72,.18)*disc*(.35+.6*w)*(1.-.4*rim)+vec3(1.,.95,.7)*pow(w,24.)*exp(-d*d*.8)*2.6+vec3(1.,.7,.2)*exp(-d*1.6)*.22)*mix(1.,.5,fl*.5);
  }
  return c*area*env;
}
vec3 pot(vec2 q,float t){
  float pull=ss(.5,.94,t); pull*=pull;
  vec2 p=(q-vec2(0.,8.2)*pull)/(1.-.72*pull); float r=length(p),a=atan(p.y,p.x),tw=fbm(p*.7+vec2(t*2.,0.));
  float arms=pow(.5+.5*sin(a*3.+r*1.5-t*17.+tw*4.5),3.)*exp(-r*.3)*ss(.2,1.2,r);
  float fine=pow(.5+.5*sin(a*7.-r*2.4+t*23.+tw*7.),6.)*exp(-r*.42);
  vec3 c=vec3(1.,.62,.15)*arms*1.9+vec3(1.,.85,.4)*fine*.9+vec3(1.,.9,.6)*exp(-r*r*.5)*2.2+vec3(1.,.5,.1)*exp(-r*.35)*.35;
  { vec2 g=p*1.1+vec2(0.,t*2.),id=floor(g); float hh=h21(id); vec2 o=vec2(h21(id+.3),h21(id+.7))*.6+.2; c+=vec3(1.,.9,.6)*glint((fract(g)-o)/1.1,.35+hh*.3)*step(.5,hh)*exp(-r*.22)*(.5+.5*sin(t*40.+hh*30.))*.9; }
  return c*ss(0.,.14,t)*(1.-ss(.9,1.,t))*(1.+pull*.8);
}
vec3 doraplus(vec2 q,float t){
  float r=length(q),a=atan(q.y,q.x),out_=1.-ss(.7,1.,t);
  float rays=pow(.5+.5*sin(a*13.+t*2.4+vn(vec2(a*2.5,t*1.5))*4.),4.)*exp(-r*.2)*ss(0.,.25,t);
  vec3 c=mix(vec3(1.,.75,.25),vec3(1.,.5,.75),.5+.5*sin(a*3.+t))*rays*1.15;
  for(int k=0;k<2;k++){ float u=ss(float(k)*.13,float(k)*.13+.55,t),R=13.*u; c+=mix(vec3(1.,.85,.4),vec3(1.,.55,.8),float(k))*exp(-pow((r-R)*1.3,2.))*(1.-u)*2.2*(.6+.8*vn(vec2(a*6.,t*5.))); }
  c+=vec3(1.,.92,.7)*exp(-r*r*.22)*(3.2*(1.-ss(.05,.55,t))+.5);
  vec2 g=q*.7,id=floor(g); float tt=t-length(id+.5)*.035-.06;
  for(int j=0;j<2;j++){ float fj=float(j),hh=h21(id+fj*17.); if(hh<.55)continue;
    vec2 o=vec2(h21(id+fj*3.+.3),h21(id+fj*5.+.7))*.7+.15; float on=ss(0.,.07,tt)*(1.-ss(.2,.55,tt))*(.6+.4*sin(tt*60.+hh*40.));
    c+=mix(vec3(1.,.85,.45),vec3(1.,.65,.85),step(.65,hh))*glint((fract(g)-o)/.7,.45+hh*.4)*on*1.1*(1.-ss(8.,12.,r)); }
  return c*out_;
}
vec3 lure(vec2 q,float t){
  vec2 p=q-vec2(0.,8.2); float r=length(p),a=atan(p.x,-p.y); a+=.3*sin(r*.35-t*4.);
  float cone=1.-ss(1.25,1.95,abs(a)), env=ss(0.,.12,t)*(1.-ss(.82,1.,t));
  float lane=pow(vn(vec2(a*11.,3.7)),2.5), run=vn(vec2(a*11.,r*.42+t*11.)), run2=vn(vec2(a*23.+5.,r*.9+t*17.));
  float s=lane*ss(.3,.85,run)*3.4+pow(run2,4.)*(.3+lane)*2.6;
  s*=cone*exp(-r*.06)*(.45+2.4/(r+1.2))*ss(19.,11.,r);
  vec3 c=vec3(.15,1.,.55)*s+vec3(.7,1.,.85)*s*s*.35;
  c+=vec3(.3,1.,.6)*exp(-r*r*.09)*(.6+1.9*ss(.25,.75,t))+vec3(.9,1.,.95)*exp(-r*r*.7)*2.*ss(.3,.8,t);
  return c*env;
}
vec3 mind(vec2 p,vec2 q,vec2 px,float t,out float hole){
  float out_=1.-ss(.76,1.,t),op=ss(.02,.3,t); vec2 e=p+vec2(0.,1.3);
  float w=5.4,hL=2.4*op*max(0.,1.-e.x*e.x/(w*w)),ins=ss(0.,.25,hL-abs(e.y))*step(abs(e.x),w);
  float r=length(e),a=atan(e.y,e.x),R=2.05;
  float fib=fbm(vec2(cos(a),sin(a))*3.5+vec2(r*1.2-t*1.5,7.))*.7+pow(vn(vec2(a*20.,r*1.5)),2.)*.6;
  float iris=(1.-ss(R-.12,R+.06,r))*ss(.62,.95,r);
  vec3 c=mix(vec3(.75,.2,1.),vec3(1.,.35,.7),ss(.8,R,r))*iris*(.45+1.5*fib)+vec3(1.,.75,.95)*exp(-pow((r-R)*5.,2.))*1.3;
  c+=vec3(1.,.9,1.)*exp(-dot(e+vec2(.55,.6),e+vec2(.55,.6))*9.)*2.;
  c+=vec3(1.,.45,.8)*.2*(1.-ss(R,w,r));
  c*=ins; hole=ins*(1.-ss(.6,.85,r))*.85;
  c+=vec3(1.,.45,.78)*exp(-abs(abs(e.y)-hL)*5.)*step(abs(e.x),w)*op*(.8+.4*fbm(e*2.+t*3.))*1.3;   // the lids
  c+=vec3(.9,.3,.75)*exp(-length(e*vec2(.3,.6)))*.55*op;                                         // aura
  float rq=length(q); c+=vec3(1.,.4,.8)*pow(.5+.5*sin(rq*1.9-t*19.),6.)*exp(-rq*.2)*.55*op*ss(.5,2.,rq);   // rings of thought on the cloth
  vec2 ec=uC-vec2(0.,1.3*uUnit); float g=ss(.3,.72,t);
  for(int k=0;k<3;k++){ vec2 o=(k==0)?uO1:((k==1)?uO2:uO3),tip=mix(ec,o,g); float d=seg(px,ec,tip)/uUnit,dt=length(px-tip)/uUnit;
    c+=g*(vec3(1.,.55,.85)*exp(-d*d*9.)*.8*(.6+.6*vn(vec2(dt*2.-t*20.,float(k))))+vec3(1.,.85,.95)*exp(-dt*dt*1.4)*1.5*ss(.3,.4,t)); }
  return c*out_;
}
vec3 peek(vec2 q,float t){
  float out_=1.-ss(.78,1.,t),z0=mix(9.,-10.5,ss(.03,.7,t)),beh=q.y-z0,onT=step(abs(q.x),10.6)*step(-10.6,q.y)*step(q.y,9.5);
  float bar=exp(-abs(beh)*3.2)*2.2+exp(-abs(beh)*.5)*.35;
  vec2 gq=abs(fract(q*.5)-.5); float grid=exp(-min(gq.x,gq.y)*26.)*step(0.,beh)*exp(-beh*.2);
  float dig=step(.86,h21(floor(q*1.5)+floor(t*24.)))*step(0.,beh)*exp(-beh*.45);
  vec3 c=vec3(.35,.8,1.)*(bar+grid*.9+dig*.5)*onT+vec3(.8,.95,1.)*exp(-abs(beh)*9.)*1.5*onT;
  float r=length(q),a=atan(q.y,q.x),on=ss(.12,.3,t);
  c+=vec3(.55,.9,1.)*on*(exp(-pow((r-3.2)*4.,2.))*step(.2,sin(a*2.+t*7.))+exp(-pow((r-2.1)*5.,2.))*step(-.3,sin(a*3.-t*10.))*.8+exp(-min(abs(q.x),abs(q.y))*7.)*step(.8,r)*step(r,4.3)*.6+exp(-r*r*.12)*.25);
  return c*out_;
}
vec3 swap_(vec2 q,float t){
  float out_=1.-ss(.8,1.,t),u=ss(0.,.82,t),th=u*9.42,R=5.2-1.9*sin(u*3.1416),r=length(q),a=atan(q.y,q.x);
  vec3 c=vec3(0.);
  for(int s=0;s<2;s++){ float h=th+float(s)*3.1416,da=mod(h-a,6.2832); vec2 hp=vec2(cos(h),sin(h))*R; float dh=length(q-hp);
    vec3 col=(s==0)?vec3(.25,1.,.85):vec3(.45,.5,1.);
    float trail=exp(-da*1.15)*exp(-pow((r-R)*(1.+da*.9),2.))*(.55+.9*vn(vec2(r*2.6,a*3.-t*13.)));
    c+=col*trail*1.9+mix(col,vec3(1.),.6)*exp(-dh*dh*1.1)*2.6+col*exp(-dh*.7)*.4; }
  c+=vec3(.9,.95,1.)*exp(-r*r*.16)*ss(.4,.5,t)*(1.-ss(.5,.68,t))*1.3+vec3(.5,.7,1.)*exp(-pow((r-ss(.45,.8,t)*11.)*1.2,2.))*(1.-ss(.45,.8,t))*1.3;
  return c*out_;
}
vec3 seal(vec2 q,vec2 p,float t){
  float out_=1.-ss(.82,1.,t),r=length(q),a=atan(q.y,q.x),on=ss(0.,.2,t);
  vec3 vi=vec3(.62,.32,1.),c=vec3(0.);
  c+=vi*on*(exp(-pow((r-4.6)*5.,2.))+exp(-pow((r-3.7)*6.,2.))*.8+exp(-pow((r-1.9)*6.,2.))*.5)*1.2;
  float rune=step(.45,h21(vec2(floor((a+t*.8)*8.594),3.)))*ss(3.78,3.9,r)*(1.-ss(4.4,4.52,r)); c+=vi*rune*on*.7*(.6+.4*vn(vec2(a*30.,t*6.)));
  for(int k=0;k<2;k++){ float an=float(k)*1.0472-t*.7; vec2 n1=vec2(cos(an),sin(an)),n2=vec2(cos(an+2.0944),sin(an+2.0944)),n3=vec2(cos(an+4.1888),sin(an+4.1888));
    float tr=max(max(dot(q,n1),dot(q,n2)),dot(q,n3))-1.85; c+=vi*exp(-abs(tr)*7.)*on*.75; }
  c+=vi*.3*exp(-r*.3)*on;
  for(int k=0;k<2;k++){ vec2 dv=normalize(vec2((k==0)?1.:-1.,.62)); float al=dot(q,dv),pe=dot(q,vec2(-dv.y,dv.x)),pr=ss(float(k)*.1,float(k)*.1+.34,t);
    float m=step(abs(al),13.*pr)*step(abs(al),12.5); float cl=fract(al*.62)-.5,par=mod(floor(al*.62),2.);
    float lk=mix(abs(length(vec2(cl*1.7,pe*1.9))-.62),length(vec2(max(abs(cl)-.36,0.),pe)),par);
    c+=m*(vec3(.85,.7,1.)*exp(-lk*lk*90.)*1.5+vi*exp(-lk*5.)*.55+vi*exp(-abs(pe)*1.6)*.22); }
  float st=ss(.34,.48,t),sc=mix(2.3,1.,st); vec2 uv=p/(7.*sc)+.5; vec4 gl=texture2D(uGlyph,clamp(uv,0.,1.));
  c+=st*(vec3(1.,.95,1.)*gl.r*1.6+vi*gl.g*1.2);
  float rp=length(p),f=ss(.46,.66,t); c+=vec3(.85,.7,1.)*exp(-pow((rp-3.2-f*7.)*1.4,2.))*(1.-f)*step(.46,t)*1.8;
  return c*out_;
}
void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uScale; vec3 w=uH*vec3(px,1.); vec2 q=w.xy/w.z, p=(px-uC)/uUnit;
  float t=uT,hole=0.; vec3 c;
  if(uMode<.5)c=wareme(q,t); else if(uMode<1.5)c=hanup(q,t); else if(uMode<2.5)c=guard(q,t); else if(uMode<3.5)c=shugi(p,t);
  else if(uMode<4.5)c=pot(q,t); else if(uMode<5.5)c=doraplus(q,t); else if(uMode<6.5)c=lure(q,t); else if(uMode<7.5)c=mind(p,q,px,t,hole);
  else if(uMode<8.5)c=peek(q,t); else if(uMode<9.5)c=swap_(q,t); else c=seal(q,p,t);
  c=1.-exp(-max(c,0.)*1.15);
  // (ユーザー 2026-11-16「スキルエフェクトもAAAに」) glints sparkle where the light is strong; the table is dimmed like a stage —
  // more at the edges of the screen than where the effect is
  float lum=max(c.r,max(c.g,c.b)); vec2 gc=floor(px/7.); float tw=step(.985,h21(gc+floor(t*14.)))*ss(.25,.6,lum);
  c+=mix(c,vec3(1.),.6)*tw*.8;
  vec2 vq=gl_FragCoord.xy/uRes-.5; float vig=ss(.15,.75,length(vq*vec2(1.,1.25)));
  float dim=(.26+.3*vig)*ss(0.,.1,t)*(1.-ss(.72,1.,t)), a=clamp(max(c.r,max(c.g,c.b))*.8+dim+hole*(1.-ss(.76,1.,t)),0.,1.);
  gl_FragColor=vec4(c,a);
}`;
let cv = null, gl = null, prog = null, U = null, raf = 0, cur = null, dead = false;
function init(host) {
  const par = host.parentNode || host;
  if (cv && cv.parentNode !== par) { par.appendChild(cv); }
  if (cv || dead) return !dead;
  cv = document.createElement('canvas'); cv.className = 'skfx'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;display:none';
  gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try { if (!gl) throw new Error('no webgl');
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('skillfx:', e.message); dead = true; cv = null; return false; }
  gl.useProgram(prog); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  U = {}; for (const n of ['uRes', 'uC', 'uO1', 'uO2', 'uO3', 'uT', 'uMode', 'uSeed', 'uUnit', 'uScale', 'uH', 'uGlyph']) U[n] = gl.getUniformLocation(prog, n);
  // the seal's character: sharp in the red channel, its glow in the green
  { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'lighter';
    g.font = '700 150px "Shippori Mincho B1","Noto Serif JP","Hiragino Mincho ProN",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#00ff00'; g.shadowBlur = 26; g.fillStyle = '#003000'; for (let k = 0; k < 4; k++) g.fillText('封', 128, 136); g.shadowBlur = 0; g.fillStyle = '#ff0000'; g.fillText('封', 128, 136);
    const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.uniform1i(U.uGlyph, 0); }
  par.appendChild(cv); return true;
}
// the 3×3 matrix taking four points of the screen to four points of the table (rows; solved by elimination)
function homography(src, dst) {
  const A = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [X, Y] = dst[i]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y, X], [0, 0, 0, x, y, 1, -Y * x, -Y * y, Y]); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; } }
  const h = A.map((r, i) => r[8] / r[i]); return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
let cues = [];
function stop() { cancelAnimationFrame(raf); raf = 0; cur = null; cues.forEach(clearTimeout); cues = []; if (cv) cv.style.display = 'none'; }
// (ユーザー 2026-11-16「スキルエフェクトもAAAに」) over the shader's light on the cloth, the language of the gacha's light (vfx.js) at
// each skill's moments: a soft flash where it strikes, glass shock rings lying on the table (flattened by its perspective), sparks with
// drag, rising embers, streams drawn in. Light mode keeps only the rings (vfx.js).
const COL = { wareme: '#8fa8ff', hanup: '#ff7a3d', guard: '#5ab0ff', shugi: '#ffd76a', pot: '#ffab4d', doraplus: '#ffc23d', lure: '#3dd68c', mind: '#ff6fb5', peek: '#7fd3ff', swap: '#9aa7ff', seal: '#c6a0ff' };
function choreo(id, seat, tb, dur) {
  const V = window.VFX; if (!V || !V.at) return;
  const W = tb.host.clientWidth || 1, H = tb.host.clientHeight || 1, hc = V.at(tb.host);
  const Q = (s, x, z) => { const p = tb.project(s, x, z); return [hc.x - W / 2 + p.x, hc.y - H / 2 + p.y]; };
  const a = Q(0, -3, 0), b = Q(0, 3, 0), c = Q(0, 0, -3), d = Q(0, 0, 3), wpx = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const sq = Math.max(.2, Math.min(1, Math.hypot(d[0] - c[0], d[1] - c[1]) / wpx)), k = Math.max(.45, Math.min(1.4, wpx / 260));
  const pl = V.pal(COL[id]), at = (u, f) => cues.push(setTimeout(f, u * dur));
  const C = Q(seat, 0, 0), me = Q(seat, 0, 6.6), others = [1, 2, 3].map(j => Q((seat + j) % 4, 0, 6.6));
  const B = (p, o) => V.burst(p[0], p[1], Object.assign({ pal: pl, scale: k, sq }, o)), S = (p, o) => V.shock(p[0], p[1], Object.assign({ pal: pl, scale: k, sq }, o));
  switch (id) {
    case 'wareme': for (const u of [.02, .18, .34]) at(u, () => B(me, { sparks: 26, embers: 4, rings: 1, flare: u > .3, dur: 600, scale: k * .8 }));
      at(.4, () => { S(me, { r: 300, n: 2 }); V.rise(me[0], me[1], { pal: V.pal('#b06cff'), n: 14, scale: k }); }); break;
    case 'hanup': for (let i = 0; i < 5; i++) at(.04 * i, () => V.rise(...Q(seat, -6 + i * 3, 6.4), { pal: pl, n: 10, scale: k * 1.2 }));
      at(.42, () => B(C, { sparks: 34, embers: 18, flare: false, scale: k * 1.1 })); at(.46, () => S(C, { r: 340 })); break;
    case 'guard': { const g = Q(seat, 0, 3.6); at(.08, () => S(g, { r: 220, n: 2 })); at(.42, () => { S(g, { r: 300, n: 1, dur: 900 }); B(g, { sparks: 18, embers: 6, rings: 0, flare: true, scale: k * .9 }); }); break; }
    case 'shugi': at(.12, () => B(C, { sparks: 30, embers: 20, petals: 18, petalCols: ['#ffe7a8', '#fff3d0', '#ffd76a', '#ffffff'], flare: true, scale: k * 1.1 })); at(.16, () => S(C, { r: 360 }));
      at(.5, () => V.rise(me[0], me[1], { pal: pl, n: 16, scale: k * 1.2 })); break;
    case 'pot': at(.08, () => S(C, { r: 260, n: 2 })); at(.12, () => V.pull(C[0], C[1], { pal: pl, n: 30, around: 300 * k, sq, dur: 520 }));
      at(.5, () => V.pull(me[0], me[1], { pal: pl, n: 26, from: [C], bend: 60 * k, dur: 420 })); at(.82, () => B(me, { sparks: 28, embers: 14, flare: true, scale: k })); break;
    case 'doraplus': at(.06, () => B(C, { sparks: 48, embers: 18, flare: true, scale: k * 1.25, dur: 1000 })); at(.1, () => S(C, { r: 420, n: 3, dur: 900 })); break;
    case 'lure': at(.06, () => V.pull(me[0], me[1], { pal: pl, n: 34, from: others.concat([Q(seat, -7, -2), Q(seat, 7, -2)]), bend: 80 * k, dur: 700 }));
      at(.7, () => { B(me, { sparks: 24, embers: 12, flare: false, scale: k }); S(me, { r: 220 }); }); break;
    case 'mind': for (const u of [.06, .26, .46]) at(u, () => S(C, { r: 300, n: 1, dur: 760 }));
      at(.1, () => B(Q(seat, 0, -1.3), { sparks: 16, embers: 10, rings: 0, flare: true, scale: k * .9 }));
      at(.62, () => others.forEach(o => B(o, { sparks: 10, embers: 4, rings: 1, flare: false, scale: k * .6, dur: 600 }))); break;
    case 'peek': at(.02, () => V.slash(me[0], me[1], { pal: pl, angle: 0, scale: k * 1.2 }));
      at(.4, () => V.slash(C[0], C[1], { pal: pl, angle: 0, scale: k })); at(.3, () => S(C, { r: 200, n: 2 })); break;
    case 'swap': at(.44, () => { B(C, { sparks: 34, embers: 10, flare: true, scale: k, pal: V.pal('#40ffd8') }); B(C, { sparks: 20, embers: 6, rings: 0, flare: false, flash: false, scale: k * .8 }); S(C, { r: 360 }); }); break;
    case 'seal': at(.02, () => S(C, { r: 220, n: 2 })); at(.4, () => { B(C, { sparks: 40, embers: 16, flare: true, scale: k * 1.2 }); S(C, { r: 440, n: 3, dur: 900 }); }); break;
  }
}
// tb: the Table3D (host: its element; project(seat, lx, lz): a place on the table → px in the host)
function play(id, seat, tb, opt) {
  const mode = IDS.indexOf(id); if (mode < 0 || !tb || !tb.host || !init(tb.host)) return Promise.resolve();
  opt = opt || {}; stop(); cv.style.display = '';
  const W = tb.host.clientWidth || 1, H = tb.host.clientHeight || 1, coarse = matchMedia('(pointer: coarse)').matches;
  const sc = Math.min(1, (opt.lite ? .45 : coarse ? .6 : .8) * Math.min(1.5, window.devicePixelRatio || 1), 1500 / W);   // (soft light: it is drawn below the screen's resolution and stretched)
  cv.width = Math.max(2, Math.round(W * sc)); cv.height = Math.max(2, Math.round(H * sc)); gl.viewport(0, 0, cv.width, cv.height);
  const P = (s, x, z) => { const p = tb.project(s, x, z); return [p.x, p.y]; };
  const dst = [[-8, -8], [8, -8], [8, 8], [-8, 8]], Hm = homography(dst.map(([x, z]) => P(seat, x, z)), dst);
  const C = P(0, 0, 0), c0 = P(0, -.5, 0), c1 = P(0, .5, 0), O = [1, 2, 3].map(k => P((seat + k) % 4, 0, 7.6));
  gl.useProgram(prog); gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uScale, cv.width / W); gl.uniform2f(U.uC, C[0], C[1]);
  gl.uniform2f(U.uO1, O[0][0], O[0][1]); gl.uniform2f(U.uO2, O[1][0], O[1][1]); gl.uniform2f(U.uO3, O[2][0], O[2][1]);
  gl.uniform1f(U.uUnit, Math.max(8, Math.hypot(c1[0] - c0[0], c1[1] - c0[1]))); gl.uniform1f(U.uMode, mode); gl.uniform1f(U.uSeed, Math.random() * 40);
  gl.uniformMatrix3fv(U.uH, false, [Hm[0], Hm[3], Hm[6], Hm[1], Hm[4], Hm[7], Hm[2], Hm[5], Hm[8]]);
  const dur = opt.dur || 1000,   // (ユーザー 2026-11-15: shorter)
    t0 = performance.now(), me = cur = {};
  try { choreo(id, seat, tb, dur); } catch (e) { console.warn('skillfx choreo:', e.message); }
  return new Promise(res => { let told = false;
    const frame = now => { if (cur !== me) { if (!told) res(); return; }
      const t = Math.min(1, (now - t0) / dur);
      gl.uniform1f(U.uT, t); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!told && t >= .6) { told = true; res(); }
      if (t < 1) raf = requestAnimationFrame(frame); else stop(); };
    raf = requestAnimationFrame(frame); });
}
root.MJSkillFx = { play, stop, ids: IDS };
})(window);
