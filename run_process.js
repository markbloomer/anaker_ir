const fs=require("fs");
const child=require("child_process");
const ftp=require("basic-ftp");
const en=require("./encrypt.js");
//const
const rawPath="./raw";
const bakPath="./bak";
const ftpPath="/ftp35522565-2"; //"/";
const maxUsed=11;
//util
const t=(ms, f)=>new Promise((r)=>ms?!setTimeout(()=>r(f()), ms):r(f()));
const r=(a, ms=0, i=0)=>i<a.length?t(i?ms:0, ()=>a[i]().then(()=>r(a, ms, i+1))):Promise.resolve();
const used=()=>{
  const out=child.execSync("df --output=pcent /", "utf-8").toString();
  const usedStr=out.substring(out.indexOf("\n"), out.lastIndexOf("%")).trim();
  return Number(usedStr);
};
const purge=(path)=>{
  const currUsed=used();
  if (currUsed<=maxUsed) return;
  console.log("[used "+currUsed+"%]");
  const files=fs.readdirSync(path).sort();
  if (!files.length) return;
  const file=files[0];
  fs.unlinkSync(path+"/"+file);
  console.log("    purge "+file);
  setTimeout(()=>purge(path), 3000);
};
const ftpOptions={
  host: "home283637480.1and1-data.host",
  user: "ftp35522565-2",
  password: en.decrypt("caa6db22ab75ac60f8bf996313aa67f635a97d4a02315e040ed614d3e7c7a6b5", fs.readFileSync("./_secret.txt", "utf-8")),
  // host: "ftp.anaker.com",
  // user: "anaker_ir",
  // password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const ftpUpload=async (fromPath, toPath)=>{
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
// const rawWatch=()=>{
//   console.log("used "+used()+"%");
//   const currFiles=fs.readdirSync(rawPath).sort();
//   currFiles.splice(-1); //remove last; being written to
//   const addFiles=currFiles.filter((file)=>!rawFiles.includes(file));
//   //const remFiles=rawFiles.filter((file)=>!currFiles.includes(file));
//   //remFiles.forEach((file)=>rem(file));
//   const tasks=addFiles
//     .map((file)=>()=>ftpUpload(rawPath+"/"+file, ftpPath+"/"+file).then(()=>{
//       add(file);
//       console.log("upload "+file);
//       // fs.renameSync(rawPath+"/"+file, bakPath+"/"+file);
//       // console.log("backup "+file);
//       // purge(bakPath);
//       // purge(rawPath);
//     }));
//   r(tasks);
// };
const add=(files, file)=>{ files.push(file); files.sort().reverse(); };
const rem=(files, file, index=files.indexOf(file))=>{ if (index>=0) files.splice(index, 1); };
const action=async (path, files, addActions=[], remActions=[])=>{
  // console.log("=================");
  // console.log("[used "+used()+"%]");
  const dirFiles=fs
    .readdirSync(path)
    .sort()
    .reverse()
    .filter((file, i, a)=>i<a.length-1); //remove last
  const addFiles=dirFiles
    .filter((file)=>!files.includes(file))
    .map((file)=>add(files, file) || file);
  const remFiles=files
    .filter((file)=>!dirFiles.includes(file))
    .map((file)=>rem(files, file) || file);
  //console.log("dirFiles: "+JSON.stringify(dirFiles, null, 2));
  //console.log("addFiles: "+JSON.stringify(addFiles, null, 2));
  //console.log("remFiles: "+JSON.stringify(remFiles, null, 2));
  for (const action of addActions) await action(addFiles);
  for (const action of remActions) await action(remFiles);
};
const uploadAndMoveAction=async (addFiles)=>{
  for (const file of addFiles) {
    console.log("uploading "+file);
    const success=true;//await ftpUpload(rawPath+"/"+file, ftpPath+"/"+file);
    if (!success) break;
    console.log(" uploaded "+file);
    fs.renameSync(rawPath+"/"+file, bakPath+"/"+file);
    console.log("   backup "+file);
  }
};
//const purgeAction=async (files, addFiles, remFiles)=>purge(rawPath);
//
fs.watch(rawPath, "utf-8", async (event, file, files=[])=>event==="rename" && await action(rawPath, files, [uploadAndMoveAction]));
console.log(" watching "+rawPath);
fs.watch(bakPath, "utf-8", async (event, file, files=[])=>event==="rename" && await action(bakPath, files));
console.log(" watching "+bakPath);
