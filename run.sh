#!/bin/sh
raspivid -o ~/anaker_ir/raw/%Y.%m.%d_%H.%M.%S.h264 -t 0 -sg 10000 -w 400 -h 300
