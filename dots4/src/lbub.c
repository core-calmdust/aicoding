#include "dots.c"
#include <stdio.h>
static u64 P[] = {0x100940b200ULL,0x2820102422ULL,0x81a2004104ULL,0xd008c0438ULL,0x40c863041ULL,0x4804508fULL, 0x800080a11ULL};
int main(){ setup(4,4);
 for(int i=0;i<7;i++){ tt_init(22); limits(0,0); double t0=js_now(); int v=value_of(P[i],-100,100); double tf=js_now()-t0, nf=nodes;
  tt_init(22); limits(0,0); t0=js_now(); int a=value_of(P[i],v-2,v-1); double tl=js_now()-t0, nl=nodes;   /* v >= v-1 ? (lower bound proof) */
  tt_init(22); limits(0,0); t0=js_now(); int b=value_of(P[i],v+1,v+2); double tu=js_now()-t0, nu=nodes;   /* v >= v+2 ? fails (upper bound proof) */
  printf("v=%d full %.0fms %.2gn | LB(%d) %.0fms %.2gn | UB(%d) %.0fms %.2gn\n",v,tf,nf,a,tl,nl,b,tu,nu); fflush(stdout);} }
