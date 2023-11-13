#!/usr/bin/env node
const fs=require("fs");
const readLastLines=require("read-last-lines");
const ftp=require("basic-ftp");
const en=require("./encrypt.js");
//const
const rawTsPath=`./raw_ts`;
const rawM3uPath=`./raw_m3u8`;
const publicPath=`./public`;
const indexFile=`index.html`;
const streamFile=`stream.m3u8`;
const streamHeader=`#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-TARGETDURATION:10\n`;
const ftpOptions={
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
//init
const rawStreamFilePath=`${rawM3uPath}/${streamFile}`;
const client=new ftp.Client();
fs.copyFileSync(`./${indexFile}`, `${publicPath}/${indexFile}`);
fs.closeSync(fs.openSync(rawStreamFilePath, "w"));
console.log(`watching ${rawStreamFilePath}`);
fs.watchFile(rawStreamFilePath, { interval: 200 }, ()=>{
  console.log("####################...");
  readLastLines.read(rawStreamFilePath, 5)
    .then((lines)=>new Promise((resolve, reject)=>{
      const matches=lines.match(/#EXTINF:(\d+\.\d+),\n(.+)\n#EXTINF:(\d+\.\d+),\n(.+)\n(#EXT-X-ENDLIST\n)?/m);
      const [, videoLength, file]=matches?matches:[];
      return file?resolve({ videoLength, file }):reject();
    }))
    .then((o)=>{
      const { file }=o;
      const [, year, month, day, hour, minute]=file.match(/(\d+)\.(\d+)\.(\d+)_(\d+)\.(\d+)\.(\d+)\.(.+)/m);
      const dayFolder=`${year}/${month}.${day}`;
      const timeFolder=`${hour}.${minute.charAt(0)}0`;
      const folder=`${dayFolder}/${timeFolder}`;
      const publicFilePath=`${publicPath}/${folder}/${file}`;
      fs.mkdirSync(`${publicPath}/${folder}`, { recursive: true });
      fs.renameSync(`${rawTsPath}/${file}`, publicFilePath);
      return { ...o, folder, dayFolder, timeFolder, publicFilePath };
    })
    .then((o)=>{
      const { videoLength, file, dayFolder, timeFolder }=o;
      //day stream
      const dayStreamFilePath=`${publicPath}/${dayFolder}/${streamFile}`;
      if (!fs.existsSync(dayStreamFilePath))
        fs.writeFileSync(dayStreamFilePath, streamHeader, "utf8");
      const dayEntry=`#EXTINF:${videoLength},\n${timeFolder}/${file}\n`;
      fs.appendFileSync(dayStreamFilePath, dayEntry, "utf8");
      return { ...o, dayStreamFilePath };
    })
    .then((o)=>{
      const { videoLength, file, folder }=o;
      //live stream
      const liveStreamFilePath=`${publicPath}/${streamFile}`;
      if (!fs.existsSync(liveStreamFilePath))
        fs.writeFileSync(liveStreamFilePath, streamHeader, "utf8");
      const liveEntry=`#EXTINF:${videoLength},\n${folder}/${file}\n`;
      fs.appendFileSync(liveStreamFilePath, liveEntry, "utf8");
      return { ...o, liveStreamFilePath };
    })
    .then((o)=>console.log(JSON.stringify(o, null, 2)) || o)
    .then((o)=>client.closed?client.access(ftpOptions).then(()=>o):Promise.resolve(o))
    .then((o)=>{
      const { file, folder, dayFolder, publicFilePath, dayStreamFilePath, liveStreamFilePath }=o;
      console.log(`uploading...`);
      return Promise.resolve()
        .then(()=>client.ensureDir(`/${folder}`))
        .then(()=>client.uploadFrom(publicFilePath, `/${folder}/${file}`))
        .then(()=>client.uploadFrom(liveStreamFilePath, `/${streamFile}`))
        .then(()=>client.uploadFrom(dayStreamFilePath, `/${dayFolder}/${streamFile}`))
        .then(()=>o)
        .catch((e)=>console.error(e))
        .finally(()=>console.log(`done`));
    })
    .catch((e)=>e?console.error(e):console.log(`no file`))
    .finally(()=>console.log("####################"));
});
