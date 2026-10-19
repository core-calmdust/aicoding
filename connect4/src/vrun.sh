#!/bin/bash
# resumable C verification of all Lv8 moves in verify logs: vrun.sh results.txt logs...
R=$1; shift
touch $R
cat "$@" | grep -v "^G " | awk '{print $1, $2}' | sort -u > $R.todo
awk '{print $1, $2}' $R | sort -u > $R.done
comm -23 $R.todo $R.done | awk '{print length($1), $0}' | sort -k1,1nr | cut -d' ' -f2- > $R.q   # deep (fast) first
nice -n 5 /home/claude/work/c4vcheck < $R.q >> $R
