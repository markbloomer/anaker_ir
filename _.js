const _=module.exports={
  r: (x, r=x)=>r,
  try: (f, y, n)=>{ try { f(y, n); } catch (e) { n(e); } },
  module: (f)=>({ m: _.m, k: ()=>f(_) }),
  async: (f, p=null, t=null)=>({
    on: ()=>{ p=new Promise((y, n)=>_.try(()=>t=_.t.time(1000, ()=>y()) && f(), y, n)); },
    off: ()=>{ p?. }
  }),
  bucket: (f)=>f(),
  grid: ()=>({}),
  view: ()=>({}),
  t: {
    //t: (ms, f)=>new Promise((r)=>ms?!setTimeout(()=>r(f()), ms):r(f())),
    time: (ms, f, t=setTimeout(()=>f(), ms))=>({
      reset: ()=>{ t=t.refresh(); },
      stop: ()=>{ clearTimeout(t); }
    }),
    min: (ms, f)=>_.t.t(ms, f),
    max: (ms, f)=>_.t.t(ms, f)
  }
};
