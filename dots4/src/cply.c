#include "dots.c"
#include <stdio.h>
static u64 rs = 99991;
static u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
int main(int argc,char**argv){ int target=atoi(argv[1]), cnt_=atoi(argv[2]); rs+=target; setup(4,4); tt_init(22);
 FILE*f=fopen("/home/claude/work/ckpt/dots4/booktest/book_0.txt","r"); u64 keys[1000]; int mvs[1000]; int n=0; char line[256];
 while(fgets(line,sizeof line,f)&&n<1000){ u64 k; int mv,v,pl,sd; if(sscanf(line,"%llx %d %d %d %d",&k,&mv,&v,&pl,&sd)==5 && pl==4){keys[n]=k; mvs[n]=mv; n++;} }
 double tot=0,mx=0; for(int i=0;i<cnt_;i++){ int j=rnd()%n; set_pos(keys[j]); play(mvs[j]); while(popc(M)<target){ int c[64],nc=0; for(int e=0;e<E;e++) if(!drawn(e)&&!gives(e)) c[nc++]=e; if(!nc) break; play(c[rnd()%nc]); }
  u64 m=M; tt_init(22); limits(0,0); double t0=js_now(); int bm,pbm,pbv; int v=best_of(m,-1,&bm,&pbm,&pbv); double dt=js_now()-t0; tot+=dt; if(dt>mx)mx=dt; printf("ply %d %llx v=%d best %d %.0fms\n",popc(m),m,v,bm,dt); fflush(stdout);} printf("avg %.0f max %.0f\n",tot/cnt_,mx); }
