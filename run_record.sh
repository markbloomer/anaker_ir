#!/bin/sh
clear
#
libcamera-vid \
  -o - \
  --nopreview \
  --timeout 0 \
  --intra 1 \
  --width 1024 \
  --height 768 \
  --framerate 30 \
  --tuning-file ./imx219_noir.json \
| ffmpeg \
  -i - \
  -y \
  -c:v copy \
  -f ssegment \
  -segment_time 10 \
  -segment_format mpegts \
  -strftime 1 \
  ./raw/%Y.%m.%d_%H.%M.%S.ts
#-vf "drawtext=text=this is a \\\\\\'string\\\\\\'\\\\: may contain one\\, or more\\, special characters" \
#-map 0:0 \

  # -f ssegment \
  # -segment_time 10 \
  # -segment_format mpegts \
  # -vf scale=320x240:flags=lanczos \
  # -strftime 1 \
  # ./raw/%Y.%m.%d_%H.%M.%S_lo.ts

  # -f image2 \
  # -r 0.1 \
  # -strftime 1 \
  # ./raw/%Y.%m.%d_%H.%M.%S.png


#  -segment_list "./raw/stream.m3u8" \
# -segment_list_size 720 \
# -segment_list_flags live \
# -segment_list_type m3u8 \

#   --output ~/anaker_ir/raw/%Y.%m.%d_%H.%M.%S.h264 \
#   --framerate 30 \
#   --irefresh adaptive \
#   --width 640 \
#   --height 480 \
#   --verbose
