module.exports=require("./_")
  .module((_, fs=require("fs"))=>({
    list: (path)=>_.async((y, n)=>fs.readdir(path, (e, l)=>e?n(e):y(l.sort()))),
    move: (pathFrom, pathTo)=>_.async((y, n)=>fs.rename(pathFrom, pathTo, (e)=>e?n(e):y()))
  }));
