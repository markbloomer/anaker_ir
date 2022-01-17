const fs=require("fs");
const crypto=require("crypto");

const randomSecret=()=>crypto.randomBytes(48).toString("hex"); //96 chars
const fill=(char, count)=>count>0?char+fill(char, count-1):"";
const obscure=(text)=>text.substring(0, text.length/4)+fill("*", text.length*3/4);
const secretToKeyIv=(secret)=>({ key: Buffer.from(secret.substring(0, 64), "hex"), iv: Buffer.from(secret.substring(64), "hex") });
const encrypt=(decryptedData, secret, keyIv=secretToKeyIv(secret))=>{
  const cipher=crypto.createCipheriv("aes-256-cbc", keyIv.key, keyIv.iv);
  return Buffer.concat([cipher.update(decryptedData), cipher.final()]).toString("hex");
};
const decrypt=(encryptedData, secret, keyIv=secretToKeyIv(secret))=>{
  const decipher=crypto.createDecipheriv("aes-256-cbc", keyIv.key, keyIv.iv);
  return Buffer.concat([decipher.update(Buffer.from(encryptedData, "hex")), decipher.final()]).toString();
};

// const _secret=randomSecret();
// console.log(obscure(_secret));
// fs.writeFileSync("./_secret.txt", _secret, { encoding: "utf-8" });

// const password="xxx";
// const secret=fs.readFileSync("./_secret.txt", "utf-8");
// console.log(obscure(secret));
// console.log(`data=${password}`);
// const encryptedData=encrypt(password, secret);
// console.log(`encryptedData=${encryptedData}`);
// const decryptedData=decrypt(encryptedData, secret);
// console.log(`decryptedData=${decryptedData}`);

module.exports={
  encrypt,
  decrypt
};
