#!/bin/sh
raspivid \
  -o ~/anaker_ir/raw/%Y.%m.%d_%H.%M.%S.h264 \
  -t 0 \
  -sg 30000 \
  -w 800 \
  -h 600
