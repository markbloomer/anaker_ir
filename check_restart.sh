#!/bin/bash
date
expr `date +%s` - `stat -c %Y /home/pi/anaker_ir/raw_m3u8/stream.m3u8` \> 60 && shutdown -r
