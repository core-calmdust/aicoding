// senet/tools/senet_exact.c — セネト（標準・ロング共通の道）の終盤の厳密な勝率（2026-11-24、担当C）。
// 局面の書き方「手番側の駒,…/相手の駒,…」（31＝上がり、省略可）。種の局面から到達できる全局面（全出目・全応手）を
// 数え上げ、価値反復（差 1e-12 まで）で「これから投げる側の勝率」を解く。
// 手の生成・移動は senet/engine.js と同じ（tools/lesson-verify-senet.js が JS の勝率表と照合）。
// 出力：S <局面数> <反復回数>／Q <手の数> <手番側の勝率> と M <from> <指した側の勝率>（手ごと。M 0 …＝パス）／X＝解いた範囲の外。
// build: gcc -O2 -o /tmp/senet_exact senet/tools/senet_exact.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
typedef uint64_t u64;
static const double P[6] = {0, 4/16., 6/16., 4/16., 1/16., 1/16.};
#define AGAIN(n) ((n)==1||(n)==4||(n)==5)
// state: low 31 bits = mover mask (bit q for square q, 1..30), high = opp mask
static u64 *HK; static int32_t *HV; static u64 HCAP;
static u64 *KEY; static int64_t NS, CAP;
static u64 hsh(u64 x){ x^=x>>33; x*=0xff51afd7ed558ccdULL; x^=x>>33; x*=0xc4ceb9fe1a85ec53ULL; x^=x>>33; return x; }
static void hinit(u64 cap){ HCAP=cap; HK=malloc(cap*8); HV=malloc(cap*4); memset(HV,-1,cap*4); }
static int64_t hget(u64 k){ u64 i=hsh(k)&(HCAP-1); while(HV[i]>=0){ if(HK[i]==k) return HV[i]; i=(i+1)&(HCAP-1);} return -1; }
static void rehash(void){ u64 oc=HCAP; u64 *ok=HK; int32_t *ov=HV; hinit(oc*2); for(u64 i=0;i<oc;i++) if(ov[i]>=0){ u64 j=hsh(ok[i])&(HCAP-1); while(HV[j]>=0) j=(j+1)&(HCAP-1); HK[j]=ok[i]; HV[j]=ov[i]; } free(ok); free(ov); }
static int64_t hadd(u64 k){ u64 i=hsh(k)&(HCAP-1); while(HV[i]>=0){ if(HK[i]==k) return HV[i]; i=(i+1)&(HCAP-1);} 
  if(NS>=CAP){ CAP*=2; KEY=realloc(KEY,CAP*8); }
  HK[i]=k; HV[i]=(int32_t)NS; KEY[NS]=k; NS++; if((u64)NS*2>HCAP) rehash(); return NS-1; }
#define MK(me,op) ((u64)(me) | ((u64)(op)<<31))
// moves: out arrays of (from, newMe, newOp, win)
typedef struct { int from; uint32_t me, op; int win; } Mv;
static int inWall(const int *b, int q){ if(b[q]!=1) return 0; int a=q,z=q; while(a-1>=1&&b[a-1]==1)a--; while(z+1<=30&&b[z+1]==1)z++; return z-a+1>=3; }
static int guarded(const int *b,int q){ return b[q]==1 && ((q>1&&b[q-1]==1)||(q<30&&b[q+1]==1)); }
static int gen(uint32_t me, uint32_t op, int n, Mv *out){
  int b[33]; for(int q=0;q<33;q++) b[q]=-1; for(int q=1;q<=30;q++){ if(me>>q&1) b[q]=0; else if(op>>q&1) b[q]=1; }
  int k=0;
  for(int p=1;p<=30;p++) if(b[p]==0){
    uint32_t nm=me&~(1u<<p), no=op; int to=-1, fin=0;
    if(p>=28){ int ex = p==28?3:p==29?2:1; if(ex==n) fin=1; else if(p+n<=30 && b[p+n]<0) to=p+n; else continue; }
    else if(p==26){ if(n==5) fin=1; else if(n==1){ int d=-1; b[26]=-1; for(int q=15;q>=1;q--) if(b[q]<0){d=q;break;} b[26]=0; to = d<0?26:d; }
      else { int t=26+n; if(b[t]>=0) continue; to=t; } }
    else { int t=p+n; if(t>26) continue; int bad=0; for(int q=p+1;q<t;q++) if(inWall(b,q)){bad=1;break;} if(bad) continue;
      if(b[t]==0) continue; if(b[t]==1){ if(t==26||guarded(b,t)) continue; no=(op&~(1u<<t))|(1u<<p); } to=t; }
    if(!fin) nm|=1u<<to;
    out[k].from=p; out[k].me=nm; out[k].op=no; out[k].win=(nm==0); k++;
  }
  return k;
}
static int32_t *ES; static int32_t *EI; static int64_t NE, ECAP; // edges: target index*2+flip, or -1 = win ; EI[state*6+n] start
static double *VV;
static int64_t solveSeed(uint32_t me, uint32_t op, int *its){
  if(HK){ free(HK); free(HV); free(KEY); free(ES); free(EI); free(VV); VV=NULL; }
  hinit(1<<20); CAP=1<<20; KEY=malloc(CAP*8); NS=0; ECAP=1<<22; ES=malloc(ECAP*4); NE=0; int64_t ICAP=(int64_t)(1<<20)*6; EI=malloc(ICAP*4);
  hadd(MK(me,op)); Mv mv[16];
  for(int64_t i=0;i<NS;i++){
    if((i+1)*6+1>ICAP){ ICAP*=2; EI=realloc(EI,ICAP*4); }
    uint32_t a=(uint32_t)(KEY[i]&0x7fffffff), o=(uint32_t)(KEY[i]>>31);
    for(int n=1;n<=5;n++){
      EI[i*6+n-1]=(int32_t)NE; int k=gen(a,o,n,mv);
      if(NE+16>ECAP){ ECAP*=2; ES=realloc(ES,ECAP*4); }
      if(!k){ ES[NE++] = AGAIN(n) ? (int32_t)(i*2) : (int32_t)(hadd(MK(o,a))*2+1); }
      for(int j=0;j<k;j++){ if(mv[j].win){ ES[NE++]=-1; continue; }
        ES[NE++] = AGAIN(n) ? (int32_t)(hadd(MK(mv[j].me,mv[j].op))*2) : (int32_t)(hadd(MK(mv[j].op,mv[j].me))*2+1); }
    }
    EI[i*6+5]=(int32_t)NE;
    if(NS>3000000){ return -1; }
  }
  VV=malloc(NS*8); for(int64_t i=0;i<NS;i++) VV[i]=0.5;
  int it;
  for(it=0;it<200000;it++){ double d=0;
    for(int64_t i=NS-1;i>=0;i--){ double v=0;
      for(int n=1;n<=5;n++){ int32_t s=EI[i*6+n-1], e=EI[i*6+n]; double bb=-1; for(int32_t j=s;j<e;j++){ int32_t t=ES[j]; double x = t<0?1.0 : (t&1)? 1-VV[t>>1] : VV[t>>1]; if(x>bb) bb=x; } v+=P[n]*bb; }
      double dd=fabs(v-VV[i]); if(dd>d) d=dd; VV[i]=v; }
    if(d<1e-12) break; }
  *its=it; return NS;
}
static double val(uint32_t me, uint32_t op){ if(!VV) return -1; int64_t i=hget(MK(me,op)); return i<0? -1 : VV[i]; }
static void parse(char *p, uint32_t *me, uint32_t *op){ int side=0; *me=0; *op=0;
  while(*p && *p!='\n'){ if(*p=='/'){side=1;p++;continue;} if(*p>='0'&&*p<='9'){ int v=strtol(p,&p,10); if(v>=1&&v<=30){ if(side) *op|=1u<<v; else *me|=1u<<v; } continue;} p++; } }
// commands: "S me/op" solve the closure of a seed; "Q n me/op" the moves of throw n with the mover's exact win chance after each
// (M from value; M 0 value = a pass; X = a state outside the solved closure)
int main(int argc,char**argv){
  char line[512]; Mv mv[16];
  while(fgets(line,sizeof line,stdin)){
    uint32_t me, op;
    if(line[0]=='S'){ parse(line+1,&me,&op); int it=0; int64_t n=solveSeed(me,op,&it); printf("S %lld %d\n",(long long)n,it); fflush(stdout); continue; }
    if(line[0]=='Q'){ char *p=line+1; int n=strtol(p,&p,10); parse(p,&me,&op);
      double v0=val(me,op); if(v0<0){ printf("X\n"); continue; }
      int k=gen(me,op,n,mv); printf("Q %d %.10f\n", k, v0);
      if(!k){ double x = AGAIN(n)? v0 : 1-val(op,me); printf("M 0 %.10f\n", x); }
      for(int j=0;j<k;j++){ double x; if(mv[j].win) x=1; else if(AGAIN(n)) x=val(mv[j].me,mv[j].op); else x=1-val(mv[j].op,mv[j].me); printf("M %d %.10f\n", mv[j].from, x); }
      continue; }
  }
  return 0;
}
