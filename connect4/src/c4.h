// Connect Four exact solver, same semantics as aicoding/connect4/engine.js (Pascal Pons style).
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
typedef uint64_t u64;
#define W 7
#define H 6
#define SZ 42
#define MINS (-(SZ/2)+3)
#define MAXS (((SZ+1)>>1)-3)
static const u64 BOT = 0x40810204081ULL;          // bottom bit of every column (7 bits per column)
static const u64 BOARD = 0x40810204081ULL * 63;
static const int ORDER[7] = {3,2,4,1,5,0,6};
static inline int popc(u64 x){ return __builtin_popcountll(x); }
static inline u64 colmask(int c){ return 63ULL << (c*7); }
static inline u64 topmask(int c){ return 1ULL << (c*7+5); }
static inline u64 winpos(u64 p, u64 m){
  u64 r = (p<<1)&(p<<2)&(p<<3);
  u64 q;
  q=(p<<7)&(p<<14); r|=q&(p<<21); r|=q&(p>>7);
  q=(p>>7)&(p>>14); r|=q&(p<<7); r|=q&(p>>21);
  q=(p<<6)&(p<<12); r|=q&(p<<18); r|=q&(p>>6);
  q=(p>>6)&(p>>12); r|=q&(p<<6); r|=q&(p>>18);
  q=(p<<8)&(p<<16); r|=q&(p<<24); r|=q&(p>>8);
  q=(p>>8)&(p>>16); r|=q&(p<<8); r|=q&(p>>24);
  return r & (BOARD ^ m);
}
typedef struct { u64 cur, mask; int n; } Pos;
static inline int canplay(const Pos*P,int c){ return (P->mask & topmask(c))==0; }
static inline u64 movebit(const Pos*P,int c){ return (P->mask + BOT) & colmask(c); }
static inline void play(Pos*P,int c){ P->cur ^= P->mask; P->mask |= movebit(P,c); P->n++; }
static inline int iswin(const Pos*P,int c){ return (winpos(P->cur,P->mask) & movebit(P,c))!=0; }
static inline int canwinnext(const Pos*P){ return (winpos(P->cur,P->mask) & ((P->mask+BOT)&BOARD))!=0; }
static int loadmoves(Pos*P,const char*s){ P->cur=P->mask=0;P->n=0; for(;*s;s++){int c=*s-'1'; if(c<0||c>=W||!canplay(P,c)||iswin(P,c)) return 0; play(P,c);} return 1; }
// ---- transposition table
static u64 *TT; static int TTB;
static void tt_init(int bits){ TTB=bits; TT=calloc((size_t)1<<bits,8); }
static void tt_clear(void){ memset(TT,0,((size_t)1<<TTB)*8); }
static inline u64 tthash(u64 k){ k^=k>>29; k*=0xBF58476D1CE4E5B9ULL; k^=k>>32; return k>>(64-TTB); }
static long long NODES;
static int nega(u64 pc, u64 pm, int n, int alpha, int beta){
  NODES++;
  u64 poss = (pm + BOT) & BOARD;
  u64 ow = winpos(pc ^ pm, pm);
  u64 f = poss & ow;
  if (f) { if (f & (f-1)) return -((SZ-n)>>1); poss = f; }
  poss &= ~(ow >> 1);
  if (!poss) return -((SZ-n)>>1);
  if (n >= SZ-2) return 0;
  int min = -((SZ-2-n)>>1);
  if (alpha < min) { alpha = min; if (alpha >= beta) return alpha; }
  int max = (SZ-1-n)>>1; (void)max;
  u64 key = pc + pm; u64 idx = tthash(key);
  u64 e = TT[idx];
  if (e && (e>>8)==key) {
    int val = (int)(int8_t)(e & 0xff);
    if (val > MAXS - MINS + 1) { min = val + 2*MINS - MAXS - 2; if (alpha < min) { alpha = min; if (alpha >= beta) return alpha; } }
    else if (val) { max = val + MINS - 1; if (beta > max) { beta = max; if (alpha >= beta) return beta; } }
  }
  u64 mv[7]; int sc[7]; int cnt=0;
  for (int i=W-1;i>=0;i--){ int c=ORDER[i]; u64 v=poss&colmask(c); if(v){ int s=popc(winpos(pc|v,pm)); int j=cnt++; for(;j>0&&sc[j-1]>s;j--){mv[j]=mv[j-1];sc[j]=sc[j-1];} mv[j]=v;sc[j]=s; } }
  u64 nc = pc ^ pm;
  for (int i=cnt-1;i>=0;i--){
    int s = -nega(nc, pm|mv[i], n+1, -beta, -alpha);
    if (s >= beta) { TT[idx] = (key<<8) | (uint8_t)(s + MAXS - 2*MINS + 2); return s; }
    if (s > alpha) alpha = s;
  }
  TT[idx] = (key<<8) | (uint8_t)(alpha - MINS + 1);
  return alpha;
}
static inline int half(int x){ return x/2; }
static int solve(const Pos*P,int weak){
  if (canwinnext(P)) return (SZ+1-P->n)>>1;
  if (P->n >= SZ) return 0;
  int min=-((SZ-P->n)>>1), max=(SZ+1-P->n)>>1;
  if (weak){min=-1;max=1;}
  while(min<max){
    int med=min+half(max-min);
    if(med<=0 && half(min)<med) med=half(min);
    else if(med>=0 && half(max)>med) med=half(max);
    int r=nega(P->cur,P->mask,P->n,med,med+1);
    if(r<=med) max=r; else min=r;
  }
  return min;
}
static int solvemove(const Pos*P,int c,int weak){
  if(!canplay(P,c)) return -100;
  if(iswin(P,c)) return (SZ+1-P->n)>>1;
  Pos Q=*P; play(&Q,c);
  if(Q.n>=SZ) return 0;
  return -solve(&Q,weak);
}
// is the score of move c (mover's view) >= s ?  (null-window test)
static int movege(const Pos*P,int c,int s){
  if(!canplay(P,c)) return 0;
  if(iswin(P,c)) return ((SZ+1-P->n)>>1) >= s;
  Pos Q=*P; play(&Q,c);
  if(Q.n>=SZ) return 0>=s;
  if(canwinnext(&Q)) return -((SZ+1-Q.n)>>1) >= s;
  // child score t from child's view; want -t >= s  <=> t <= -s ; test window (-s, -s+1)
  int r = nega(Q.cur,Q.mask,Q.n,-s,-s+1);
  return r <= -s;
}
// canonical key like engine.js keyOf (base-128 digits per column, column 6 most significant)
static u64 colcode(const Pos*P,int c,int first_is_cur){
  // stones of player 1 (first player) in column c
  u64 m=(P->mask>>(c*7))&63; int h=popc(m);
  u64 p1 = ((P->n&1)==0) ? P->cur : (P->cur ^ P->mask); // first player's stones
  u64 b=(p1>>(c*7))&63;
  (void)first_is_cur;
  return (1ULL<<h) | b;
}
static u64 keyraw(const Pos*P,int mir){ u64 v=0; for(int k=6;k>=0;k--){ int c=mir?6-k:k; v=v*128+colcode(P,c,0);} return v; }
static u64 canon(const Pos*P,int*mir){ u64 a=keyraw(P,0),b=keyraw(P,1); if(a<=b){ if(mir)*mir=0; return a;} if(mir)*mir=1; return b; }
