#!/usr/bin/env node
const child=require("child_process");
const fs=require("fs");
const readLastLines=require("read-last-lines");
const basicFtp=require("basic-ftp");
const en=require("./encrypt.js");
//util
const pad=(value, len, char='0', v=value.toString())=>len<=v.length?v:char+pad(v, len-1, char);
const used=(sleep=0.25)=>{
  const out=child.execSync(`${(sleep?`sleep ${sleep} && `:"")}df --output=pcent /`, "utf-8").toString();
  const usedStr=out.substring(out.indexOf("\n"), out.lastIndexOf("%")).trim();
  return Number(usedStr);
};
const timeout=(func, ms=30*1000)=>{
  let isExpired=false;
  return (x)=>{
    isExpired=false;
    const t=setTimeout(()=>isExpired=true, ms);
    const oot=(task, rejectTask=(x)=>x)=>
      (x)=>isExpired
        ?Promise.resolve(x).then(rejectTask).then(()=>Promise.reject())
        :Promise.resolve(x).then(task);
    return Promise.resolve(x).then((x)=>func(x, oot)).then((x)=>clearTimeout(t) || x);
  };
};
//const
const maxUsed=90;
const ms=3000;
const rawTsPath=`./raw_ts`;
const rawM3uPath=`./raw_m3u8`;
const publicPath=`./public`;
const publicStaticPath=`./public_static`;
const stateFile=`stream.json`;
const streamFile=`stream.m3u8`;
const streamHeader=`#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-TARGETDURATION:10\n`;
const streamEnd=`#EXT-X-ENDLIST\n`;
const rawStreamFilePath=`${rawM3uPath}/${streamFile}`;
const stateFilePath=`${publicPath}/${stateFile}`;
const liveStreamFilePath=`${publicPath}/${streamFile}`;
const ftpOptions={
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const state={};
const ftp=new basicFtp.Client(0);
//tasks
//read state; generate entries
const readState=()=>{
  if (!fs.existsSync(stateFilePath)) return Object.assign(state, { entries: [] });
  const obj=JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
  const entries=obj.entries.map(({ f, fd, fs, upr })=>createEntry
                                ({ file: f, fileDuration: fd, fileSize: fs, uploadRemainSize: upr }));
  return Object.assign(state, { entries });
};
//save state
const saveState=(prev)=>{
  const entries=state.entries.map(({ file, fileDuration, fileSize, uploadRemainSize })=>
                                  ({ f: file, fd: fileDuration, fs: fileSize, upr: uploadRemainSize }));
  fs.writeFileSync(stateFilePath, JSON.stringify({ entries }, null, 2), "utf8");
  return prev;
};
//extract file, otherwise skip
const parseStreamEntry=()=>readLastLines
  .read(rawStreamFilePath, 5)
  .then((lines)=>new Promise((resolve, reject)=>{
    const [, fileDuration, file]=lines.match(/#EXTINF:(\d+\.\d+),\n(.+)\n(#EXT-X-ENDLIST\n)?/m)??[];
    return file?resolve({ file, fileDuration, fileSize: 0, uploadRemainSize: 0 }):reject();
  }));
//extract date and time; init entry
const createEntry=({ file, fileDuration, fileSize, uploadRemainSize })=>{
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
    fileSize,
    uploadRemainSize,
    dayFolder,
    timeFolder,
    folder,
    publicFilePath: `${publicPath}/${folder}/${file}`,
    dayStreamFilePath: `${publicPath}/${dayFolder}/${streamFile}`,
    dayPrevStreamFilePath: `${publicPath}/${dayPrevFolder}/${streamFile}`,
    liveEntry: `#EXTINF:${fileDuration},\n${folder}/${file}\n`,
    dayEntry: `#EXTINF:${fileDuration},\n${timeFolder}/${file}\n`
  };
};
//update entries; get previous
const addCurrGetPrev=(curr)=>new Promise((resolve, reject)=>{
  const { entries }=state;
  const prev=entries.at(-1);
  if (prev?.file===curr.file) return reject();
  entries.push(curr);
  console.log(JSON.stringify(curr, null, 2));
  return prev?resolve(prev):reject();
});
//make folder; move file
const makeFolderMoveFile=(prev)=>{
  const { file, folder, publicFilePath }=prev;
  fs.mkdirSync(`${publicPath}/${folder}`, { recursive: true });
  fs.renameSync(`${rawTsPath}/${file}`, publicFilePath);
  prev.fileSize=prev.uploadRemainSize=fs.statSync(publicFilePath).size;
  return prev;
};
//check drive space; purge oldest
const checkDriveSpacePurgeOldest=(prev)=>{
  const currUsed=used();
  if (currUsed<=maxUsed) return prev;
  const entry=state.entries.shift();
  if (!entry) return prev;
  const { file, publicFilePath }=entry;
  console.log(`delete ${file} (${currUsed}% of ${maxUsed}%)`);
  fs.unlinkSync(publicFilePath);
  return prev;
};
//update live stream
const updateLiveStream=(prev)=>{
  const liveStream=state.entries.reduce((stream, { fileSize, liveEntry })=>stream+(fileSize>0?liveEntry:""), streamHeader);
  fs.writeFileSync(liveStreamFilePath, liveStream, "utf8");
  return prev;
};
//end previous day stream
const endPrevDayStream=(prev)=>{
  const { dayPrevStreamFilePath }=prev;
  if (!fs.existsSync(dayPrevStreamFilePath)) return prev;
  return readLastLines.read(dayPrevStreamFilePath, 2)
      .then((lines)=>lines.endsWith(streamEnd)?null:fs.appendFileSync(dayPrevStreamFilePath, streamEnd, "utf8"))
      .then(()=>prev);
};
//update day stream
const updateDayStream=(prev)=>{
  const { dayEntry, dayStreamFilePath }=prev;
  if (!fs.existsSync(dayStreamFilePath))
    fs.writeFileSync(dayStreamFilePath, streamHeader, "utf8");
  fs.appendFileSync(dayStreamFilePath, dayEntry, "utf8");
  return prev;
};
//copy public
const copyPublic=()=>{
  fs.cpSync(publicStaticPath, publicPath, { recursive: true });
};
//upload files
const uploadFiles=(prev, oot=(x)=>x)=>new Promise((resolve, reject)=>{
  const { file, fileSize, folder, dayFolder, publicFilePath, dayStreamFilePath }=prev;
  return Promise.resolve()
    .then(oot(()=>!ftp.closed?null:console.log(`reconnecting...`) || ftp.access(ftpOptions)))
    .then(oot(()=>ftp.ensureDir(`/${folder}`)))
    .then(()=>ftp.trackProgress(oot(({ bytes })=>console.log(`${pad((100*bytes/fileSize)|0, 3, ' ')}% ${prev.uploadRemainSize=fileSize-bytes}`))))
    .then(oot(()=>console.log(`uploading ${file}`) || ftp.uploadFrom(publicFilePath, `/${folder}/${file}`), ()=>ftp.trackProgress()))
    .then(()=>ftp.trackProgress())
    .then(oot(()=>console.log(`uploading ${stateFile}`) || ftp.uploadFrom(stateFilePath, `/${stateFile}`)))
    .then(oot(()=>console.log(`uploading ${streamFile}`) || ftp.uploadFrom(liveStreamFilePath, `/${streamFile}`)))
    .then(oot(()=>console.log(`uploading ${streamFile} (day)`) || ftp.uploadFrom(dayStreamFilePath, `/${dayFolder}/${streamFile}`)))
    .then(()=>console.log(`uploading done`) || resolve(prev))
    .catch((e)=>(e?console.error(e):null) || reject());
});
//watch stream
const watchStream=()=>{
  fs.closeSync(fs.openSync(rawStreamFilePath, "w"));
  console.log(`watching ${rawStreamFilePath}`);
  fs.watchFile(rawStreamFilePath, { interval: 200 }, timeout((_, oot)=>{
    console.log(`####################...`);
    return Promise.resolve()
      .then(parseStreamEntry)
      .then(createEntry)
      .then(addCurrGetPrev)
      .then(makeFolderMoveFile)
      .then(saveState)
      .then(checkDriveSpacePurgeOldest)
      .then(endPrevDayStream)
      .then(updateDayStream)
      .then(updateLiveStream)
      .then(oot((prev)=>uploadFiles(prev, oot), saveState))
      .then(saveState)
      .catch((e)=>e?console.error(e):console.log(`break`))
      .finally(()=>console.log(`####################`));
  }, ms));
};
//init
Promise.resolve()
  .then(copyPublic)
  .then(readState)
  .then(watchStream)
  .catch((e)=>e?console.error(e):null);
