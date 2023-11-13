#!/usr/bin/env node
const child=require("child_process");
const libcamera=child.spawn("libcamera-vid", [
  "--tuning-file /usr/share/libcamera/ipa/raspberrypi/imx219_noir.json",
  "--nopreview",
  "--timeout 0",
  "--width 1280",
  "--height 1024",
  "-o -"
]);
const ffmpeg=child.spawn("ffmpeg", [
  "-i -",
  "-codec:v copy",
  "-f ssegment",
  "segment_time 10",
  "-segment_format mpegts",
  "-segment_list ./raw_m3u8/stream.m3u8",
  "-segment_list_flags live",
  "-segment_list_type m3u8",
  "-strftime 1",
  "./raw/%Y.%m.%d_%H.%M.%S.ts"
]);

libcamera.on("end", ()=>process.stdout.write("libcamera ended"));
libcamera.on("exit", ()=>process.stdout.write("libcamera exited"));
ffmpeg.on("end", ()=>process.stdout.write("ffmpeg ended"));
ffmpeg.on("exit", ()=>process.stdout.write("ffmpeg exited"));

libcamera.stdout.pipe(ffmpeg.in);
