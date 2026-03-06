#!/usr/bin/env node
const fs=require("fs");
const basicFtp=require("basic-ftp");
const en=require("./encrypt.js");
//util
const promise=(ms, f)=>new Promise((y)=>ms?!setTimeout(()=>y(f()), ms):y(f()));
const sequence=(a, ms=0, i=0)=>i<a.length?promise(i?ms:0, ()=>a[i]().then(()=>sequence(a, ms, i+1))):Promise.resolve();
//const
const ftpOptions={
  host: "192.168.1.253",
  user: "anaker_ir_dev",
  password: en.decrypt("25c5c612cb64e5953cf863048df9bfe698cc8627e564efd90e43493f1d9574ae", fs.readFileSync("./_secret.txt", "utf-8")),
  secure: true,
  secureOptions: { rejectUnauthorized: false }
};
const ftp=new basicFtp.Client();
//ftp.ftp.verbose=true;
Promise.resolve()
  .then(()=>console.log(`connect`) || ftp.access(ftpOptions))
  //.then(()=>console.log(`features:`) || ftp.features()).then((x)=>console.log(x))
  .then(()=>console.log(`list`) || ftp.list(`/2024/09.09/01.30`)).then((x)=>console.log(x))
  //.then(()=>console.log(`send`) || ftp.send(`SIZE /index.html`)).then((x)=>console.log(x))
  .then(()=>console.log(`size`) || ftp.size(`/2024/09.09/01.30/2024.09.09_01.32.06.ts`)).then((x)=>console.log(x))
  .catch((e)=>console.log(`error`) || console.error(e))
  .finally(()=>console.log(`close`) || ftp.close());
