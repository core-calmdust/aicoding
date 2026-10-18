#define PROFILE
#include "dots.c"
#include <stdio.h>
int main(int argc,char**argv){ setup(4,4); tt_init(24); u64 m=strtoull(argv[1],0,16); limits(0,0); int v=value_of(m,-100,100); printf("v=%d nodes=%.0f cap=%.0f loony=%.0f\n",v,nodes,prof_cap,prof_loony);
 double t=0; for(int i=0;i<16;i++) t+=prof_cut[i]; for(int i=0;i<16;i++) printf("cut@%d: %.3f\n",i,prof_cut[i]/t); printf("cuts %.0f, by sacrifice %.0f\n",t,prof_cutsac);
 for(int i=0;i<=E;i++) if(prof_safe[i]) printf("safe %d: %.0f\n",i,prof_safe[i]); }
