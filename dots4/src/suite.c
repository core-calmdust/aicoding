#include "dots.c"
#include <stdio.h>
static u64 P[] = {0x100940b200ULL,0x2820102422ULL,0x81a2004104ULL,0xd008c0438ULL,0x40c863041ULL,0x4804508fULL};
int main(int argc,char**argv){ setup(4,4); if(getenv("KILLER")) use_killer=atoi(getenv("KILLER")); if(getenv("ETC")) etc_min=atoi(getenv("ETC")); if(getenv("CHAIN")) use_chain_prune=atoi(getenv("CHAIN")); if(getenv("PVS")) use_pvs=atoi(getenv("PVS")); if(getenv("ORD")) ord_mode=atoi(getenv("ORD"));
 double tn=0, tt0=js_now(); for(int i=0;i<6;i++){ tt_init(getenv("BITS")?atoi(getenv("BITS")):22); limits(0,0); int v=value_of(P[i],-100,100); tn+=nodes; printf("%d ",v);} printf(" nodes %.0f time %.0fms\n",tn,js_now()-tt0); }
