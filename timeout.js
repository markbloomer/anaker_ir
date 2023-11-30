const _={
  p: (f)=>new Promise((y, n)=>f(y, n)),
  t: (x, f=()=>{}, ms=1000)=>_.p((y)=>{ f(); setTimeout(()=>y(x), ms); })
};
const timeout=(func, ms=30*1000)=>{
  let isExpired=false;
  return (x)=>{
    isExpired=false;
    const t=setTimeout(()=>isExpired=true, ms);
    const oot=(task, rejectTask=(x)=>x)=>
      (x)=>isExpired
        ?Promise.resolve(x).then(rejectTask).then(()=>Promise.reject())
        :Promise.resolve(x).then(task);
    return Promise.resolve(x).then((x)=>func(x, oot)).then((x)=>clearTimeout(t) || x);
  };
};
Promise.resolve("xxx")
  .then((x)=>console.log(`start ${JSON.stringify(x)}`) || x)
  .then(timeout((x, oot)=>[1,2,3,4,5,6].reduce((p, n)=>p.then(oot((x)=>console.log(`task${n} ${JSON.stringify(x)}`) || _.t(x), (x)=>console.log(`reject1 ${JSON.stringify(x)}`) || x)), Promise.resolve(x))))
  .then((x)=>console.log(`done ${JSON.stringify(x)}`) || x)
  .catch((e)=>e?console.error(e):console.log(`break`));
