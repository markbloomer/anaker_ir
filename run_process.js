#!/usr/bin/env node
const fs=require("fs");
const child=require("child_process");
const ftp=require("basic-ftp");
const ffmpeg=require("ffmpeg");
const en=require("./encrypt.js");
// const _=require("./_.js");
// const f=require("./_f.js");
//const
const rawPath="./raw";
const rawImgPath="./raw_img";
const bakPath="./bak";
const ftpPath="/";//"//ftp35522565-2";
const maxUsed=90; //percent
const timeout=8000; //milliseconds
//util
const t=(ms, f)=>new Promise((r)=>ms?!setTimeout(()=>r(f()), ms):r(f()));
const r=(a, ms=0, i=0)=>i<a.length?t(i?ms:0, ()=>a[i]().then(()=>r(a, ms, i+1))):Promise.resolve();
const used=()=>{
  const out=child.execSync("sleep 0.25 && df --output=pcent /", "utf-8").toString();
  const usedStr=out.substring(out.indexOf("\n"), out.lastIndexOf("%")).trim();
  return Number(usedStr);
};
const getFiles=(path)=>fs.readdirSync(path).sort();
const elapsed=async(maxTime, func)=>{
  const startTime=Date.now();
  await func(()=>Date.now()-startTime>maxTime);
  return Date.now()-startTime;
};
const purge=()=>{
  const currUsed=used();
  console.log(`[used ${currUsed}%]`);
  if (currUsed<=maxUsed) return;
  const files=[rawPath, rawImgPath]
    .map((path)=>({
      path,
      file: getFiles(path).shift()
    }));
  files.forEach((f)=>{
    if (!f.file) return;
    console.log(`purge ${f.file}...`);
    fs.unlinkSync(`${f.path}/${f.file}`);
    console.log(`purge ${f.file}`);
  });
};
const ftpOptions={
  // host: "192.168.43.254",
  // user: "anaker_ir",
  // password: "hellohello",
  // host: "home283637480.1and1-data.host",
  // user: "/ftp35522565-2",
  // password: en.decrypt("caa6db22ab75ac60f8bf996313aa67f635a97d4a02315e040ed614d3e7c7a6b5", fs.readFileSync("./_secret.txt", "utf-8")),
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const ftpUpload=async(fromPath, toPath)=>{
  try {
    const client=new ftp.Client();
    await client.access(ftpOptions);
    await client.uploadFrom(fromPath, toPath);
    client.close();
    return true;
  }
  catch (e) { console.log(e); }
  return false;
};
const add=(files, file)=>{ files.push(file); files.sort().reverse(); };
const rem=(files, file, index=files.indexOf(file))=>{ if (index>=0) files.splice(index, 1); };
const action=async(path, files, addActions=[], remActions=[])=>{
  await elapsed(timeout, async(past)=>{
    const dirFiles=getFiles(path).reverse().filter((file, i)=>file && i);
    const addFiles=dirFiles.filter((file)=>!files.includes(file)).map((file)=>add(files, file) || file);
    const remFiles=files.filter((file)=>!dirFiles.includes(file)).map((file)=>rem(files, file) || file);
    for (const addAction of addActions) { if (past()) return; await addAction(addFiles); }
    for (const remAction of remActions) { if (past()) return; await remAction(remFiles); }
  });
};
const watchFunc=(path, func, files=[])=>async(e)=>e==="rename" && await func(files);
const purgeActionFunc=(path)=>async()=>purge(path);
const uploadAndMoveAction=async()=>{
  const file=getFiles(rawPath).reverse().shift();
  if (!file) return;
  console.log("uploading "+file);
  const success=await ftpUpload(rawPath+"/"+file, ftpPath+"/"+file);
  if (!success) return;
  console.log(" uploaded "+file);
  console.log("   moving "+file+" "+rawPath+" => "+bakPath);
  fs.renameSync(rawPath+"/"+file, bakPath+"/"+file);
  //console.log("mv "+rawPath+"/"+file+" "+bakPath+"/"+file);
  //child.execSync("mv "+rawPath+"/"+file+" "+bakPath+"/"+file, "utf-8");
  console.log("    moved "+file+" "+rawPath+" => "+bakPath);
  console.log("[used "+used()+"%]");
};
// //raw
// const rawActions=[
//   uploadAndMoveAction,
//   purgeActionFunc(bakPath),
//   purgeActionFunc(rawPath)
// ];
// const rawFunc=async(files)=>await action(rawPath, files, rawActions);
// fs.watch(rawPath, "utf-8", watchFunc(rawPath, rawFunc));
// console.log(" watching "+rawPath);
// //bak
// const bakFunc=async(files)=>await action(bakPath, files);
// fs.watch(bakPath, "utf-8", watchFunc(bakPath, bakFunc));
// console.log(" watching "+bakPath);
//
const wait=(ms)=>new Promise((y)=>!setTimeout(()=>y(), ms));
const fill=(s, w=0, r=" ")=>s.toString()+r.repeat(Math.max(w-s.toString().length, 0));
const sideBySide=(leftFiles, rightFiles)=>{
  for (let i=0; true; i++) {
    //TODO walk left/right separately
    const left=i<leftFiles.length?leftFiles[i]:null;
    const right=i<rightFiles.length?rightFiles[i]:null;
    if (!left && !right) break;
    if (left===right) console.log(`   ${fill(left, 20)}    ${fill(right, 20)}`);
    else if (left) console.log(` + ${fill(left, 20)}  - ${fill("", 20, "_")}`);
    else if (right) console.log(` - ${fill("", 20, "_")}  + ${fill(right, 20)}`);
  }
};
const p=(f)=>new Promise((y, n)=>f(y, n));
//const e=(f)=>p((y, n)=>{ try { y(f()); } catch (e) { n(e); } });
// const ffmpeg_low=(fileFrom, fileTo)=>{
//   new ffmpeg(fileFrom)
//     .then((video)=>{
//       video
//         .setVideoSize("160x?", true, true, "#000000")
//         .save(fileTo, (error, file)=>{ if (!error) console.log(`saved ${file}`); });
//     }, (e)=>console.log(`Error: ${e}`));
// };
const ffmpeg_low=(fileFrom, folderTo, fileNameTo)=>p((y, n)=>new ffmpeg(fileFrom)
  .then((video)=>video
    .setVideoSize("160x?", true, true)
    .save(`${folderTo}/${fileNameTo}`, (e, files)=>e?n(e):y(files))));
const ffmpeg_img=(fileFrom, folderTo, fileNameTo)=>p((y, n)=>new ffmpeg(fileFrom)
  .then((video)=>video
    .fnExtractFrameToJPG(folderTo, {
      frame_rate: 1,
      number: 1,
      file_name: fileNameTo
    }, (e, files)=>e?n(e):y(files))));
  //.setVideoSize("160x?", true, true)
  //.save(fileTo, (e, file)=>e?n(e):y(file)));
let files=getFiles(rawPath);
const run=async(e)=>{
  if (e!=="rename") return;
  const filesNow=getFiles(rawPath);
  const filesAdd=filesNow.filter((fileNow)=>!files.includes(fileNow));
  //const filesRem=files.filter((file)=>!filesNow.includes(file));
  files=filesNow;
  if (!filesAdd.length) return;
  //console.log(`  added ${JSON.stringify(filesAdd)}`);
  //console.log(`removed ${JSON.stringify(filesRem)}`);
  console.log("###...");
  purge();
  purge();
  const client=new ftp.Client();
  //client.ftp.verbose=true;
  try {
    await client.access(ftpOptions);
    // const remoteFiles=(await client.list(remotePath))
    //   .map((file)=>file.name)
    //   .sort()
    //   .reverse();
    const reverseFiles=[...files].reverse();
    //sideBySide(localFiles, remoteFiles);
    reverseFiles.shift();
    const file=reverseFiles.shift();
    if (file) {
      // const fileImg=`${file}.jpg`;
      // console.log(`img ${fileImg}...`);
      // await ffmpeg_img(`${rawPath}/${file}`, rawImgPath, fileImg);
      // fs.renameSync(`${rawImgPath}/${`${file}_1.jpg`}`, `${rawImgPath}/${fileImg}`);
      // console.log(`img ${fileImg}`);
      // console.log(`upload ${fileImg}...`);
      // await client.uploadFrom(`${rawImgPath}/${fileImg}`, `/public/img/${fileImg}`);
      // console.log(`upload ${fileImg}`);
      // console.log(`low ${file}...`);
      // await ffmpeg_low(`${rawPath}/${file}`, `./raw_low`, file);
      // console.log(`low ${file}`);
      console.log(`upload ${file}...`);
      await client.uploadFrom(`${rawPath}/${file}`, `/public/${file}`);
      console.log(`upload ${file}`);
      console.log(`upload stream.m3u8...`);
      await client.uploadFrom(`./raw_m3u8/stream.m3u8`, `/public/stream.m3u8`);
      console.log(`upload stream.m3u8`);
      console.log(`upload index.html...`);
      await client.uploadFrom(`./index.html`, `/public/index.html`);
      console.log(`upload index.html`);
    }
  }
  catch(err) { console.log(err); }
  client.close();
  console.log("###");
};
fs.watch(rawPath, "utf-8", run);
console.log(` watching ${rawPath}`);
//ffmpeg_lo("./raw/2022.04.22_15.14.13.ts", "./raw/2022.04.22_15.14.13_lo.ts");
//ffmpeg_img("/home/pi/anaker_ir/raw/2023.09.24_18.24.36.ts", "/home/pi/anaker_ir/raw", "2023.09.24_18.24.36.ts.img");
