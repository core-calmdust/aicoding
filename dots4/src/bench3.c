#include "dots.c"
#include <stdio.h>
static u64 rs = 1234567;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static u64 prefix(int d){ set_pos(0); int k=0; while(k<d){ int c[64],n=0; for(int e=0;e<E;e++) if(!drawn(e)&&!gives(e)) c[n++]=e; if(!n) for(int e=0;e<E;e++) if(!drawn(e)) c[n++]=e; play(c[rnd()%n]); k++;} return M; }
int main(int argc,char**argv){ 
#ifdef HAS_ETC
if(getenv("ETC")) etc_min=atoi(getenv("ETC"));
#endif
#ifdef HAS_PVS
if(getenv("PVS")) use_pvs=atoi(getenv("PVS"));
#endif
 int d=atoi(argv[1]), cnt_=atoi(argv[2]), bits=argc>3?atoi(argv[3]):24; int a=argc>4?atoi(argv[4]):-100, b=argc>5?atoi(argv[5]):100; rs+=d*7919; setup(4,4); tt_init(bits);
 for(int i=0;i<cnt_;i++){ u64 m=prefix(d); tt_init(bits); limits(0,0); double t0=js_now(); int v=value_of(m,a,b); double t1=js_now();
  printf("d=%d m=%llx window(%d,%d) v=%d %.0fms %.0fnodes\n",d,m,a,b,v,t1-t0,nodes); fflush(stdout);} }
