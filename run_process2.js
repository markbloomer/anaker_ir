#!/usr/bin/env node
const child=require("child_process");
const fs=require("fs");
const readLastLines=require("read-last-lines");
const ftp=require("basic-ftp");
const en=require("./encrypt.js");
//util
const pad=(value, len, char='0', v=value.toString())=>len<=v.length?v:char+pad(v, len-1, char);
const used=(sleep=0.25)=>{
  const out=child.execSync(`${(sleep?`sleep ${sleep} && `:"")}df --output=pcent /`, "utf-8").toString();
  const usedStr=out.substring(out.indexOf("\n"), out.lastIndexOf("%")).trim();
  return Number(usedStr);
};
//const
const maxUsed=90;
const rawTsPath=`./raw_ts`;
const rawM3uPath=`./raw_m3u8`;
const publicPath=`./public`;
const publicStaticPath=`./public_static`;
const stateFile=`stream.json`;
const streamFile=`stream.m3u8`;
const streamHeader=`#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-TARGETDURATION:10\n`;
const streamEnd=`#EXT-X-ENDLIST\n`;
const ftpOptions={
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
//init
const rawStreamFilePath=`${rawM3uPath}/${streamFile}`;
const stateFilePath=`${publicPath}/${stateFile}`;
const liveStreamFilePath=`${publicPath}/${streamFile}`;
const state=fs.existsSync(stateFilePath)?JSON.parse(fs.readFileSync(stateFilePath, "utf8")):{ entries: [] };
const client=new ftp.Client();
fs.cpSync(publicStaticPath, publicPath, { recursive: true });
fs.closeSync(fs.openSync(rawStreamFilePath, "w"));
//watch
console.log(`watching ${rawStreamFilePath}`);
fs.watchFile(rawStreamFilePath, { interval: 200 }, ()=>{
  console.log(`####################...`);
  readLastLines.read(rawStreamFilePath, 5)
    //extract file, otherwise skip
    .then((lines)=>new Promise((resolve, reject)=>{
      const [, fileDuration, file]=lines.match(/#EXTINF:(\d+\.\d+),\n(.+)\n(#EXT-X-ENDLIST\n)?/m)??[];
      return file?resolve({ file, fileDuration }):reject();
    }))
    //extract date and time; init entry
    .then(({ file, fileDuration })=>{
      const [, year, month, day, hour, minute]=file.match(/(\d+)\.(\d+)\.(\d+)_(\d+)\.(\d+)\.(\d+)\.(.+)/m);
      const dayFolder=`${year}/${month}.${day}`;
      const timeFolder=`${hour}.${minute.charAt(0)}0`;
      const folder=`${dayFolder}/${timeFolder}`;
      const datePrev=new Date(year, month, day);
      datePrev.setDate(datePrev.getDate()-1);
      const dayPrevFolder=`${datePrev.getFullYear()}/${pad(datePrev.getMonth(), 2)}.${pad(datePrev.getDate(), 2)}`;
      return {
        file,
        fileDuration,
        fileSize: 0,
        uploadRemainSize: 0,
        dayFolder,
        timeFolder,
        folder,
        publicFilePath: `${publicPath}/${folder}/${file}`,
        dayStreamFilePath: `${publicPath}/${dayFolder}/${streamFile}`,
        dayPrevStreamFilePath: `${publicPath}/${dayPrevFolder}/${streamFile}`,
        liveEntry: `#EXTINF:${fileDuration},\n${folder}/${file}\n`,
        dayEntry: `#EXTINF:${fileDuration},\n${timeFolder}/${file}\n`
      };
    })
    //update entries; get previous
    .then((curr)=>new Promise((resolve, reject)=>{
      const { entries }=state;
      const prev=entries.at(-1);
      if (prev?.file===curr.file) return reject();
      entries.push(curr);
      console.log(JSON.stringify(curr, null, 2));
      return prev?resolve(prev):reject();
    }))
    //make folder; move file
    .then((prev)=>{
      const { file, folder, publicFilePath }=prev;
      fs.mkdirSync(`${publicPath}/${folder}`, { recursive: true });
      fs.renameSync(`${rawTsPath}/${file}`, publicFilePath);
      prev.fileSize=prev.uploadRemainSize=fs.statSync(publicFilePath).size;
      return prev;
    })
    //save state
    .then((prev)=>{
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf8");
      return prev;
    })
    //check drive space; purge oldest
    .then((prev)=>{
      const currUsed=used();
      if (currUsed<=maxUsed) return prev;
      const entry=state.entries.shift();
      if (!entry) return prev;
      const { file, publicFilePath }=entry;
      console.log(`delete ${file} (${currUsed}% of ${maxUsed}%)`);
      fs.unlinkSync(publicFilePath);
      return prev;
    })
    //update live stream
    .then((prev)=>{
      const liveStream=state.entries.reduce((stream, { fileSize, liveEntry })=>stream+(fileSize>0?liveEntry:""), streamHeader);
      fs.writeFileSync(liveStreamFilePath, liveStream, "utf8");
      return prev;
    })
    //end previous day stream
    .then((prev)=>{
      const { dayPrevStreamFilePath }=prev;
      if (!fs.existsSync(dayPrevStreamFilePath)) return prev;
      return readLastLines.read(dayPrevStreamFilePath, 2)
          .then((lines)=>lines.endsWith(streamEnd)?null:fs.appendFileSync(dayPrevStreamFilePath, streamEnd, "utf8"))
          .then(()=>prev);
    })
    //update day stream
    .then((prev)=>{
      const { dayEntry, dayStreamFilePath }=prev;
      if (!fs.existsSync(dayStreamFilePath))
        fs.writeFileSync(dayStreamFilePath, streamHeader, "utf8");
      fs.appendFileSync(dayStreamFilePath, dayEntry, "utf8");
      return prev;
    })
    //upload files
    .then((prev)=>{
      const { file, folder, dayFolder, publicFilePath, dayStreamFilePath }=prev;
      console.log(`uploading...`);
      return Promise.resolve()
        .then(()=>client.closed?client.access(ftpOptions):null)
        .then(()=>client.ensureDir(`/${folder}`))
        .then(()=>client.uploadFrom(publicFilePath, `/${folder}/${file}`).then(()=>prev.uploadRemainSize=0))
        .then(()=>client.uploadFrom(liveStreamFilePath, `/${streamFile}`))
        .then(()=>client.uploadFrom(dayStreamFilePath, `/${dayFolder}/${streamFile}`))
        .then(()=>prev)
        .catch((e)=>console.error(e))
        .finally(()=>console.log(`uploading done`));
    })
    //save state
    .then((prev)=>{
      fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), "utf8");
      return prev;
    })
    .catch((e)=>e?console.error(e):console.log(`break`))
    .finally(()=>console.log(`####################`));
});
