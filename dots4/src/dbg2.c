#include "dots.c"
#include <stdio.h>
static i8 memo[1<<12];
static int bf(u64 m){ if(memo[m]!=-128) return memo[m]; int best=-100,any=0;
 for(int e=0;e<E;e++) if(!((m>>e)&1)){ any=1; set_pos(m); int k=play(e); int v=bf(m|(1ULL<<e)); v=k?k+v:-v; if(v>best)best=v;} if(!any)best=0; memo[m]=best; return best;}
int main(){ setup(2,2); memset(memo,-128,sizeof memo); bf(0);
 for(int s=0;s<NS;s++){ printf("s%d:",s); for(int e=0;e<E;e++)printf(" %d",perm[s][e]); printf("\n");}
 printf("corners:"); for(int i=0;i<ncorner;i++)printf(" (%d,%d)",cpa[i],cpb[i]); printf("\n");
 int bad=0; for(u64 m=0;m<4096;m++){ for(int s=0;s<NS;s++){ u64 x=apply_sym(s,m); if(memo[x]!=memo[m]){bad++; if(bad<5)printf("sym %d m %llx\n",s,m);} } if(memo[corner_norm(m)]!=memo[m]){bad++; if(bad<10)printf("corner m %llx -> %llx: %d %d\n",m,corner_norm(m),memo[m],memo[corner_norm(m)]);} }
 printf("bad %d\n",bad); }
