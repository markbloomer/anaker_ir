#!/bin/sh
clear
rm -rf ./raw_ts/* ./raw_m3u8/*
libcamera-vid \
  --tuning-file /usr/share/libcamera/ipa/rpi/vc4/imx219_noir.json \
  --nopreview \
  --timeout 0 \
  --width 1280 \
  --height 1024 \
  -o - \
| ffmpeg \
  -i - \
  -codec:v copy \
  -f ssegment \
  -segment_time 10 \
  -segment_format mpegts \
  -segment_list ./raw_m3u8/stream.m3u8 \
  -segment_list_flags live \
  -segment_list_type m3u8 \
  -strftime 1 \
  ./raw_ts/%Y.%m.%d_%H.%M.%S.ts

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


# -segment_list "./raw/stream.m3u8" \
# -segment_list_size 720 \
# -segment_list_flags live \
# -segment_list_type m3u8 \

#   --output ~/anaker_ir/raw/%Y.%m.%d_%H.%M.%S.h264 \
#   --framerate 30 \
#   --irefresh adaptive \
#   --width 640 \
#   --height 480 \
#   --verbose
