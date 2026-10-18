#include "dots.c"
#include <stdio.h>
int main(int argc,char**argv){ setup(2,2); tt_init(16);
 for(int f=0;f<8;f++){ use_tt=f&1; use_loony=(f>>1)&1; use_prune=(f>>2)&1; tt_init(16); limits(0,0); printf("tt%d loony%d prune%d -> %d\n",use_tt,use_loony,use_prune,value_of(0,-100,100)); }
}
