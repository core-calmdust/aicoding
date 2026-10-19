// Build the Lv8 opening tree: every AI-to-move position reachable when the AI plays its book move and the
// opponent plays anything, up to ply D. Record per new (canonical) AI node in DFS order: move + value.
// usage: gen <side 0=AI first,1=AI second> <D> <strongFromPly> <cache.bin> <out.txt> <maxSeconds>
// cache.bin: snapshot of solved nodes (key u64, move i8, val i8 packed into 16 bytes), written atomically.
#include "c4.h"
#include <time.h>
#include <unistd.h>
#include <signal.h>
typedef struct { u64 key; int8_t mv, val, used; } Ent;   // val: exact score, or 100+{-1,0,1} for weak
static Ent *HT; static size_t HN, HCAP;
static size_t hslot(u64 k){ size_t i=(size_t)((k*0x9E3779B97F4A7C15ULL)>>30) & (HCAP-1); while(HT[i].used && HT[i].key!=k) i=(i+1)&(HCAP-1); return i; }
static Ent* hget(u64 k){ size_t i=hslot(k); return HT[i].used?&HT[i]:NULL; }
static void hput(u64 k,int mv,int val){ size_t i=hslot(k); if(!HT[i].used){HN++;HT[i].used=1;HT[i].key=k;} HT[i].mv=mv; HT[i].val=val; }
static const char *CACHE; static time_t T0, LASTSAVE; static int MAXSEC; static long long newsolved;
static void save(void){
  char tmp[512]; snprintf(tmp,sizeof tmp,"%s.tmp",CACHE);
  FILE*f=fopen(tmp,"wb"); for(size_t i=0;i<HCAP;i++) if(HT[i].used){ fwrite(&HT[i].key,8,1,f); fwrite(&HT[i].mv,1,1,f); fwrite(&HT[i].val,1,1,f);} fflush(f); fsync(fileno(f)); fclose(f);
  rename(tmp,CACHE); LASTSAVE=time(0);
}
static void load(void){ FILE*f=fopen(CACHE,"rb"); if(!f) return; u64 k; int8_t m,v; while(fread(&k,8,1,f)==1 && fread(&m,1,1,f)==1 && fread(&v,1,1,f)==1) hput(k,m,v); fclose(f); }
static int D, SFROM, timeout_hit; static FILE*OUT; static long long nnodes; static u64 *VIS; static size_t VCAP;
static int visit(u64 k){ size_t i=(size_t)((k*0xD6E8FEB86659FD93ULL)>>30)&(VCAP-1); while(VIS[i]){ if(VIS[i]==k) return 0; i=(i+1)&(VCAP-1);} VIS[i]=k; return 1; }
// choose move + value for AI node P (actual orientation move returned)
static void decide(const Pos*P,int*mv,int*val){
  for(int i=0;i<7;i++){int c=ORDER[i]; if(canplay(P,c)&&iswin(P,c)){*mv=c;*val=(SZ+1-P->n)>>1;return;}}
  int mir; u64 k=canon(P,&mir); Ent*e=hget(k);
  if(e && !(P->n >= SFROM && e->val>=90)){ *mv = mir? 6-e->mv : e->mv; *val=e->val; return; }
  int strong = P->n >= SFROM;
  int s = solve(P, !strong);
  int best=-1;
  if(!strong && s<0){            // weakly lost: find the slowest loss exactly (descending thresholds)
    for(int t=-1; best<0 && t>=-21; t--) for(int i=0;i<7 && best<0;i++){ int c=ORDER[i]; if(canplay(P,c) && movege(P,c,t)){ best=c; s=t; } }
    strong=1;
  }
  for(int i=0;i<7 && best<0;i++){ int c=ORDER[i]; if(!canplay(P,c)) continue; if(movege(P,c,s)) best=c; }
  if(best<0){ fprintf(stderr,"no move?\n"); save(); exit(3);}  // cannot happen
  *mv=best; *val = strong ? s : 100+s;
  hput(k, mir?6-best:best, *val); newsolved++;
  if(time(0)-LASTSAVE >= 600) save();
  if(time(0)-T0 >= MAXSEC) timeout_hit=1;
}
static char path[64];
static void dfs(Pos P){
  if(timeout_hit) return;
  int mir; u64 k=canon(&P,&mir);
  if(!visit(k)) return;
  int mv,val; decide(&P,&mv,&val); if(timeout_hit) return;
  nnodes++;
  if(OUT){ int cm = mir? 6-mv : mv; fprintf(OUT,"%s %d %d\n", P.n?path:"-", cm, val); }
  if(iswin(&P,mv)) return;
  Pos Q=P; play(&Q,mv); path[P.n]='1'+mv; path[P.n+1]=0;
  if(Q.n+1>D) return;
  for(int r=0;r<7;r++){
    if(!canplay(&Q,r) || iswin(&Q,r)) continue;
    Pos R=Q; play(&R,r); path[Q.n]='1'+r; path[Q.n+1]=0;
    if(R.n<=D && R.n<SZ) dfs(R);
    path[Q.n]=0;
  }
  path[P.n]=0;
}
// enumerate all positions of exactly ply t (no four on the board), in column order, and run dfs from each
static void onterm(int sig){ (void)sig; timeout_hit=1; }
static void roots(Pos P,int t){
  if(timeout_hit) return;
  if(P.n==t){ dfs(P); return; }
  for(int c=0;c<7;c++){ if(!canplay(&P,c)||iswin(&P,c)) continue; Pos Q=P; play(&Q,c); path[P.n]='1'+c; path[P.n+1]=0; roots(Q,t); path[P.n]=0; }
}
int main(int argc,char**argv){
  if(argc<7){fprintf(stderr,"usage\n");return 1;}
  int side=atoi(argv[1]); D=atoi(argv[2]); SFROM=atoi(argv[3]); CACHE=argv[4]; MAXSEC=atoi(argv[6]);
  T0=LASTSAVE=time(0); signal(SIGTERM,onterm); signal(SIGINT,onterm);
  tt_init(25); HCAP=1<<22; HT=calloc(HCAP,sizeof(Ent)); VCAP=1<<22; VIS=calloc(VCAP,8);
  load(); fprintf(stderr,"cache %zu\n",HN);
  OUT=fopen(argv[5],"w");
  Pos P={0,0,0};
  int RMAX = argc>7 ? atoi(argv[7]) : side;   // roots: every position of ply side, side+2, ... <= RMAX
  for(int r=side;r<=RMAX;r+=2) roots(P,r);
  save(); fclose(OUT);
  fprintf(stderr,"nodes %lld new %lld cache %zu sec %ld %s\n",nnodes,newsolved,HN,(long)(time(0)-T0), timeout_hit?"TIMEOUT":"DONE");
  return timeout_hit?2:0;
}
