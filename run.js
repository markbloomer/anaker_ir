const fs=require("fs");
const { execSync }=require("child_process");
//
const folderPath="./raw";
const maxUsed=80;
const files=[];
//
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
    const file=files[0];
    rem(file);
    fs.unlinkSync(folderPath+"/"+file);
  }
};
const watch=()=>{
  const currFiles=fs.readdirSync(folderPath).sort();
  const addFiles=currFiles.filter((file)=>!files.includes(file));
  const remFiles=files.filter((file)=>!currFiles.includes(file));
  remFiles.forEach((file)=>rem(file));
  addFiles.forEach((file)=>purge() || add(file));
};
//
fs.watch(folderPath, "utf-8", watch);
console.log("watching "+folderPath);
