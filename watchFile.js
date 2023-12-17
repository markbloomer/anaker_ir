const fs=require("fs");
const watchFile=(filePath, interval, func)=>{
  try {
    let prevSize=fs.statSync(filePath).size;
    setInterval(()=>{
      const currSize=fs.statSync(filePath).size;
      if (prevSize==currSize) return;
      prevSize=currSize;
      func();
    }, interval);
  }
  catch (e) { console.error(e); }
};
