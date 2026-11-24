// patolli/tools/patolli_exact.c — パトリ（ベルの復元）の厳密な勝率（2026-11-24、担当C）。patolli_exact.js の C 版（同じ計算、速い）。
// ベルの復元：60マスの周回、取りなし、勝ち＝先に6個上げる（宝・場は勝ち負けに関係しない）。局面＝両者の駒と手番。
// 駒は前にしか進まないので、同じ位置で手番だけ入れかわるパス（0の目・動かせる駒がない）を2元の連立方程式で解き、
// 到達できる全局面（全出目・全応手・腕の先のもう一度）を再帰で厳密に解く（反復なし）。
// 側の局面＝盤上の駒のマスの集合（1..59、59ビット）＋待ちの数（3ビット）。上がり＝6−盤上−待ち。進む向きは両者とも同じ（既定）。
// 入力：1行に「Q n a,b,c/d,e」（手番側の駒の位置／相手の駒の位置。0＝待ち、60＝上がり、上がりは省略可）
// 出力：「Q <手の数> <手番側の勝率> <解いた局面数>」と手ごとに「M <from> <to> <指した側の勝率>」（手がなければ M -1 -1 …＝パス）
// 引数：解く局面の上限（既定 1200万。超えたら X）。
// build: gcc -O2 -o /tmp/patolli_exact patolli/tools/patolli_exact.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
typedef uint64_t u64;
#define GOAL 60
#define LL 59
static const double P[6] = {1/32., 5/32., 10/32., 10/32., 5/32., 1/32.};
static const int STEP[6] = {0, 1, 2, 3, 4, 10};
static int AG[61];
// hash: key pair -> value pair
static u64 *K0, *K1; static double *V0, *V1; static unsigned char *U; static u64 HC, HN;
static u64 mix(u64 a, u64 b){ u64 x=a*0x9E3779B97F4A7C15ULL ^ (b+0x632BE59BD9B4E019ULL+(a<<6)+(a>>2)); x^=x>>33; x*=0xff51afd7ed558ccdULL; x^=x>>33; return x; }
static void hinit(u64 c){ HC=c; HN=0; K0=malloc(c*8); K1=malloc(c*8); V0=malloc(c*8); V1=malloc(c*8); U=calloc(c,1); }
static void grow(void){ u64 oc=HC; u64 *a=K0,*b=K1; double *x=V0,*y=V1; unsigned char *u=U; hinit(oc*2);
  for(u64 i=0;i<oc;i++) if(u[i]){ u64 j=mix(a[i],b[i])&(HC-1); while(U[j]) j=(j+1)&(HC-1); U[j]=1; K0[j]=a[i]; K1[j]=b[i]; V0[j]=x[i]; V1[j]=y[i]; HN++; }
  free(a); free(b); free(x); free(y); free(u); }
static int hget(u64 a, u64 b, double *x, double *y){ u64 j=mix(a,b)&(HC-1); while(U[j]){ if(K0[j]==a&&K1[j]==b){ *x=V0[j]; *y=V1[j]; return 1; } j=(j+1)&(HC-1); } return 0; }
static void hput(u64 a, u64 b, double x, double y){ if(HN*2>=HC) grow(); u64 j=mix(a,b)&(HC-1); while(U[j]) j=(j+1)&(HC-1); U[j]=1; K0[j]=a; K1[j]=b; V0[j]=x; V1[j]=y; HN++; }
// side state: bits 1..59 = on board (bit i), bits 60..62 = waiting count
#define WAIT(s) ((int)((s)>>60))
#define MASK(s) ((s)&((1ULL<<60)-2))
static int onb(u64 s){ return __builtin_popcountll(MASK(s)); }
static int done(u64 s){ return 6-onb(s)-WAIT(s); }
// is square i of side me (0/1) occupied by anybody? side0 square i = q (30+i)%60, side1 square j = q j%60
static int occ(u64 me_s, u64 op_s, int me, int i){
  if(MASK(me_s)>>i&1) return 1;
  int j = (i+30)%60; // the other side's square on the same q (both directions the same)
  if(j>=1 && j<=LL && (MASK(op_s)>>j&1)) return 1;
  return 0;
}
typedef struct { int from, to; u64 ns; int again, fin; } Mv;
static int gen(u64 me, u64 op, int n, Mv *out){
  int k=0; if(!n) return 0;
  if(WAIT(me)){ int to=-1; if(!onb(me)) to=n; else if(n==1) to=1;
    if(to>=1 && to<=GOAL){ if(to==GOAL || !occ(me,op,0,to)){ u64 ns=me-(1ULL<<60); int fin=to==GOAL; if(!fin) ns|=1ULL<<to; out[k].from=0; out[k].to=to; out[k].ns=ns; out[k].again=!fin&&AG[to]; out[k].fin=fin; k++; } } }
  for(int i=1;i<=LL;i++) if(MASK(me)>>i&1){ int to=i+n; if(to>GOAL) continue; int fin=to==GOAL; if(!fin && occ(me,op,0,to)) continue;
    u64 ns=me&~(1ULL<<i); if(!fin) ns|=1ULL<<to; out[k].from=i; out[k].to=to; out[k].ns=ns; out[k].again=!fin&&AG[to]; out[k].fin=fin; k++; }
  return k;
}
static double after(u64 me, u64 op, Mv *m);
static void pair(u64 a, u64 b, double *x, double *y);   // a = side to move first value; returns x = V(a moves), y = V(b moves)
// value for the mover after move m (me moved), op = opponent
static double after(u64 me, u64 op, Mv *m){
  u64 ns=m->ns; if(done(ns)==6) return 1.0;
  double x,y; pair(ns, op, &x, &y);
  return m->again ? x : 1.0-y;
}
static u64 LIMIT=12000000; static int OVER=0;
static void pair(u64 a, u64 b, double *x, double *y){
  if(hget(a,b,x,y)) return;
  if(OVER || HN/2>LIMIT){ OVER=1; *x=*y=0.5; return; }
  double c[2]={0,0}, q[2]={0,0}; Mv mv[16];
  for(int t=0;t<2;t++){ u64 me=t?b:a, op=t?a:b; q[t]+=P[0];
    for(int k=1;k<=5;k++){ int n=STEP[k], cnt=gen(me,op,n,mv); if(!cnt){ q[t]+=P[k]; continue; }
      double best=-1; for(int j=0;j<cnt;j++){ double v=after(me,op,&mv[j]); if(v>best) best=v; } c[t]+=P[k]*best; } }
  double X=(c[0]+q[0]-q[0]*c[1]-q[0]*q[1])/(1-q[0]*q[1]), Y=c[1]+q[1]*(1-X);
  hput(a,b,X,Y); hput(b,a,Y,X); *x=X; *y=Y;
}
static u64 parseSide(char **pp){ char *p=*pp; u64 s=0; int w=0, cnt=0;
  while(*p && *p!='/' && *p!='\n'){ if(*p>='0'&&*p<='9'){ int v=strtol(p,&p,10); cnt++; if(v==0) w++; else if(v<=LL) s|=1ULL<<v; continue; } p++; }
  *pp=p; return s|((u64)w<<60); }
int main(int argc,char**argv){
  if(argc>1) LIMIT=strtoull(argv[1],0,10);
  for(int i=0;i<=60;i++) AG[i]=(i>=1&&i<=LL)&&((i%15)==7||(i%15)==8);
  hinit(1<<22); char line[512]; Mv mv[16];
  while(fgets(line,sizeof line,stdin)){
    if(line[0]=='R'){ free(K0);free(K1);free(V0);free(V1);free(U); hinit(1<<22); continue; }
    if(line[0]!='Q') continue; char *p=line+1; int n=strtol(p,&p,10); u64 a=parseSide(&p); if(*p=='/') p++; u64 b=parseSide(&p);
    if(HN/2>LIMIT/2){ free(K0);free(K1);free(V0);free(V1);free(U); hinit(1<<22); }
    OVER=0; double x,y; pair(a,b,&x,&y);
    if(OVER){ printf("X\n"); free(K0);free(K1);free(V0);free(V1);free(U); hinit(1<<22); OVER=0; fflush(stdout); continue; }
    int cnt=gen(a,b,n,mv); printf("Q %d %.10f %llu\n",cnt,x,(unsigned long long)HN/2);
    if(!cnt) printf("M -1 -1 %.10f\n", 1.0-y);
    for(int j=0;j<cnt;j++) printf("M %d %d %.10f\n", mv[j].from, mv[j].to, after(a,b,&mv[j]));
    fflush(stdout);
  }
  return 0;
}
