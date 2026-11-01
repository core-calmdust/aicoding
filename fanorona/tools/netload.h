// native tools: load a trained net file ("FNN1", scale, floats) into the engine
static int netLoad(const char *fn) {
  FILE *f = fopen(fn, "rb"); if (!f) return 0;
  char mg[4]; float sc; if (fread(mg, 1, 4, f) != 4 || fread(&sc, 4, 1, f) != 1) { fclose(f); return 0; }
  size_t n = fread(NET, sizeof(float), NNET, f); fclose(f);
  if (n != NNET) return 0;
  net_set(sc); return 1;
}
