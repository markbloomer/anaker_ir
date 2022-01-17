const fs=require("fs");
const { execSync }=require("child_process");
const ftp=require("basic-ftp");
const en=require("./encrypt.js");
//const
const rawPath="./raw";
const ftpPath="/ftp35522565-2/raw";
const maxUsed=80;
const files=[];
//util
const used=()=>{
  const out=execSync("df --output=pcent /", "utf-8").toString();
  const usedStr=out.substring(out.indexOf("\n"), out.lastIndexOf("%")).trim();
  const used=Number(usedStr);
  console.log("used "+used+"%");
  return used;
};
const add=(file)=>{
  console.log("add "+file);
  files.push(file);
  files.sort();
};
const rem=(file)=>{
  console.log("rem "+file);
  files.splice(files.indexOf(file), 1);
};
const purge=()=>{
  while (used()>maxUsed) {
    if (!files.length) continue;
    const file=files[0];
    rem(file);
    fs.unlinkSync(rawPath+"/"+file);
  }
};
const ftpOptions={
  host: "home283637480.1and1-data.host",
  user: "ftp35522565-2",
  password: en.decrypt("caa6db22ab75ac60f8bf996313aa67f635a97d4a02315e040ed614d3e7c7a6b5", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const ftpUpload=(fromPath, toPath, callback)=>{
  const client=new ftp.Client();
  client
    .access(ftpOptions)
    .then(()=>client.uploadFrom(fromPath, toPath))
    .then(()=>client.close())
    .then(()=>callback())
    .catch((e)=>console.log(e));
};
const watch=()=>{
  const currFiles=fs.readdirSync(rawPath).sort();
  currFiles.splice(-1); //remove last; being written to
  const addFiles=currFiles.filter((file)=>!files.includes(file));
  const remFiles=files.filter((file)=>!currFiles.includes(file));
  remFiles.forEach((file)=>rem(file));
  addFiles.forEach((file)=>{
    purge();
    add(file);
    ftpUpload(rawPath+"/"+file, ftpPath+"/"+file, ()=>console.log("upload successful"));
  });
};
//
fs.watch(rawPath, "utf-8", ()=>watch());
console.log("watching "+rawPath);
