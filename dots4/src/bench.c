#include "dots.c"
#include <stdio.h>
static u64 rs = 1234567;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
/* random game prefix of d moves using random safe moves (captures taken) */
static u64 prefix(int d){ set_pos(0); int k=0; while(k<d){ int c[64],n=0; for(int e=0;e<E;e++) if(!drawn(e)&&!gives(e)) c[n++]=e; if(!n) for(int e=0;e<E;e++) if(!drawn(e)) c[n++]=e; play(c[rnd()%n]); k++;} return M; }
int main(int argc,char**argv){ if(getenv("PVS")) use_pvs=atoi(getenv("PVS")); if(getenv("HIST")) use_hist=atoi(getenv("HIST")); int d=atoi(argv[1]), cnt_=atoi(argv[2]), bits=argc>3?atoi(argv[3]):24; rs+=d*7919; setup(4,4); tt_init(bits);
 for(int i=0;i<cnt_;i++){ u64 m=prefix(d); tt_init(bits); limits(0,0); double t0=js_now(); int v=value_of(m,-100,100); double t1=js_now(); 
  tt_init(bits); limits(0,0); int w=value_of(m,-1,1); double t2=js_now();
  printf("d=%d m=%llx v=%d  full %.0fms %.0fnodes | null(-1,1)->%d %.0fms\n",d,m,v,t1-t0,nodes,w,t2-t1); fflush(stdout);} }
