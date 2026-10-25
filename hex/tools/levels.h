// AI levels (same table as engine.js LEVELS): playouts / ms per move, sampling temperature (×1000),
// probability of a random move, tactical shortcuts (1 immediate wins / blocks, 2 forced connections ≤ 2, 3 ≤ 3).
typedef struct { int po, ms, temp; float rnd; int must; } Lv;
static const Lv LV[21] = {
  { 0 },
  { 40, 0, 900, .30f, 0 },     // 15級
  { 60, 0, 800, .22f, 0 },
  { 90, 0, 700, .16f, 0 },
  { 130, 0, 600, .11f, 1 },
  { 200, 0, 500, .07f, 1 },
  { 300, 0, 420, .04f, 1 },    // 10級
  { 450, 0, 350, .02f, 1 },
  { 700, 0, 280, 0, 1 },
  { 1000, 0, 220, 0, 1 },
  { 1500, 0, 170, 0, 1 },
  { 2200, 0, 120, 0, 1 },      // 5級
  { 3300, 0, 80, 0, 2 },
  { 5000, 0, 50, 0, 2 },
  { 7500, 0, 25, 0, 2 },
  { 11000, 0, 0, 0, 2 },       // 1級
  { 16000, 0, 0, 0, 3 },       // 初段
  { 25000, 0, 0, 0, 3 },
  { 40000, 0, 0, 0, 3 },
  { 0, 1500, 0, 0, 3 },        // 四段
  { 0, 3000, 0, 0, 3 },        // 五段
};
