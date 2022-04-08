module.exports=require("./_")
  .module((_, cp=require("child_process"))=>({
    ex: (command)=>_.async((y, n)=>cp.exec(command, "utf-8", (e, b)=>e?n(e):y(b.toString())))
  }));
