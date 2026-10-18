#!/bin/sh
# build dots4.wasm + dots4book.bin into the site folder
cd /home/claude/work/dots4src
clang --target=wasm32 -O3 -nostdlib -Wl,--no-entry -o /home/claude/aicoding/dots/dots4.wasm dots.c
cp dots.c /home/claude/aicoding/dots/solver4.c
node mkbook.js /home/claude/work/ckpt/dots4/book /home/claude/aicoding/dots/dots4book.bin
