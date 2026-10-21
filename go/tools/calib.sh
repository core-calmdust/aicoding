#!/bin/sh
# adjacent-level matches on 19x19 (kyu ladder candidates); results appended to /tmp/claude-0/calib.jsonl
cd "$(dirname "$0")/.."
L='{"T":0.05,"slip":0,"top":3}
{"T":0.25,"slip":0,"top":4}
{"T":0.4,"slip":0.01,"top":6}
{"T":0.55,"slip":0.02,"top":8}
{"T":0.7,"slip":0.03,"top":10}
{"T":0.85,"slip":0.04,"top":12}
{"T":1.0,"slip":0.05,"top":14}
{"T":1.1,"slip":0.07,"top":16}
{"T":1.2,"slip":0.09,"top":18}
{"T":1.3,"slip":0.11,"top":20}
{"T":1.4,"slip":0.14,"top":24}
{"T":1.5,"slip":0.17,"top":28}
{"T":1.6,"slip":0.2,"top":32}
{"T":1.7,"slip":0.24,"top":36}
{"T":1.8,"slip":0.28,"top":40}
{"T":1.9,"slip":0.33,"top":50}'
prev=""
echo "$L" | while read -r cur; do
  if [ -n "$prev" ]; then node tools/selfplay.mjs "$prev" "$cur" ${GAMES:-24} 19 2>/dev/null >> /tmp/claude-0/calib.jsonl; fi
  prev="$cur"
done
