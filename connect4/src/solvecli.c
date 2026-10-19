#include "c4.h"
// reads move strings from stdin, prints: moves score(strong) w0..w6 (per-move strong scores, -100 illegal)
int main(int argc,char**argv){
  int weak = argc>1 && argv[1][0]=='w';
  tt_init(24);
  char line[128];
  while(fgets(line,sizeof line,stdin)){
    line[strcspn(line,"\r\n ")]=0; Pos P; if(!loadmoves(&P,line)){printf("%s bad\n",line);continue;}
    printf("%s %d", line[0]?line:"-", solve(&P,weak));
    for(int c=0;c<7;c++) printf(" %d", solvemove(&P,c,weak));
    printf("\n"); fflush(stdout);
  }
}
