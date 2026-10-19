#include "c4.h"
// stdin: "position move ..." lines; checks weak value of chosen move == weak value of position.
// prints: position move posWeak moveWeak OK|BAD
int main(){ tt_init(25); char line[256];
  while(fgets(line,sizeof line,stdin)){
    char ps[64]; int mv; if(sscanf(line,"%63s %d",ps,&mv)!=2) continue;
    Pos P; if(!loadmoves(&P, strcmp(ps,"-")?ps:"")){printf("%s %d bad\n",ps,mv);continue;}
    int w=solvemove(&P,mv,1);
    int v = w>0 ? w : solve(&P,1);   // a winning move is optimal: no need to solve the position
    int sv = v>0?1:v<0?-1:0, sw = w>0?1:w<0?-1:0;
    printf("%s %d %d %d %s\n",ps,mv,sv,sw,sv==sw?"OK":"BAD"); fflush(stdout);
  }}
