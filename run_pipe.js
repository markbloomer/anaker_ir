#!/usr/bin/env node
const child=require("child_process");
const fs=require("fs");
const libcamera=child.spawn("libcamera-vid", [
  "--nopreview",
  "--output ~/anaker_ir/raw/out.h264",
  "--timeout 0",
  "--intra 1",
  "--width 1024",
  "--height 768",
  "--framerate 30",
  "--tuning-file /usr/share/libcamera/ipa/raspberrypi/imx219_noir.json",
  "--verbose",
]);
const file=fs.createWriteStream("out.txt");

libcamera.stdout.pipe(process.stdout, { end: false });
libcamera.stdout.pipe(file);

process.stdin.resume();
process.stdin.pipe(libcamera.stdin, { end: false });
process.stdin.pipe(file);

libcamera.stdin.on("end", ()=>process.stdout.write("REPL stream ended."));
libcamera.on("exit", (code)=>process.exit(code));
