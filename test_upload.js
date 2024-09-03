#!/usr/bin/env node
const fs=require("fs");
const basicFtp=require("basic-ftp");
const en=require("./encrypt.js");
//util
const pad=(value, len, char='0', v=value.toString())=>len<=v.length?v:char+pad(v, len-1, char);
const timeout=(func, ms=30*1000, timeout=null)=>(...args)=>{
  if (timeout) return timeout=clearTimeout(timeout);
  let isExpired=false;
  timeout=setTimeout(()=>isExpired=true, ms);
  const oot=(task=(x)=>x)=>(x)=>isExpired?Promise.resolve(x).then(task).then(()=>Promise.reject()):Promise.resolve(x);
  return Promise.resolve()
    .then(()=>func(oot, ...args))
    .catch((e)=>e?console.error(e):null)
    .finally(()=>timeout=clearTimeout(timeout));
};
//const
const ftpOptions={
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const ftp=new basicFtp.Client(0);
//ftp.ftp.verbose=true;
//tasks
//upload files
const uploadFiles=(prev, oot=(x)=>x)=>new Promise((resolve, reject)=>{
  const { fileSize, folder }=prev;
  return Promise.resolve()
    .then(oot()).then(()=>ftp.closed?(console.log(`reconnecting...`) || ftp.access(ftpOptions)):null)
    .then(oot()).then(()=>ftp.ensureDir(`/${folder}`))
    .then(oot()).then(()=>ftp.trackProgress(({ bytes })=>console.log(`${pad((100*bytes/fileSize)|0, 3, ' ')}% ${prev.uploadRemainSize=fileSize-bytes}`) || oot(()=>ftp.close())().catch(()=>{})))
    .then(oot()).then(()=>uploadFile(prev))
    .then(oot()).then(()=>ftp.trackProgress(), ()=>ftp.trackProgress())
    .then(oot()).then(()=>console.log(`uploading done`) || resolve(prev))
    .catch((e)=>(e?console.error(e):console.error(`upload timeout`)) || reject());
});
//upload file
const uploadFile=(prev)=>new Promise((resolve, reject)=>{
  const { file, folder, publicFilePath }=prev;
  console.log(`uploading ${file}`);
  const readStream=fs.createReadStream(publicFilePath)
    .on("error", (e)=>console.log(`readStream error: ${e}`));
  Promise.resolve()
    .then(()=>ftp.size(`/${folder}/${file}`))
    .then((size)=>console.log(`size: ${size}`))
    //.then((localStart)=>ftp.appendFrom(readStream, `/${folder}/${file}`, { localStart: 0 }))
    .then(()=>ftp.uploadFrom(readStream, `/${folder}/${file}`))
    .then(()=>readStream.close(resolve), ()=>readStream.close())
    .catch((e)=>e=="Error: User closed client during task"?reject():(console.error(e) || reject(e)));
});
//init
Promise.resolve()
  .then(()=>uploadFiles({ file: `sample.ts`, folder: `test`, publicFilePath: `` }))
  .catch((e)=>e?console.error(e):null);
