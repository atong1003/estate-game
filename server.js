// 电子庄园 - 云服务器
const h=require("http"),f=require("fs"),p=require("path");
const dir=p.join(__dirname,"data");
if(!f.existsSync(dir))f.mkdirSync(dir);
// 产品价格表
const PP={"ch7":150,"ch8":250,"ch9":400,"ch10":500,"ch11":120,"ch12":200,"ch13":800,"ch14":1000,"ch15":1200,"ch16":1500,"ch17":2000,"ch18":2500,"ch19":3000,"ch20":4000,"ch21":5000,"ch22":6000,"ch23":8000,"ch24":10000,"ch25":15000};
function br(r){return new Promise(r2=>{let b="";r.on("data",c=>b+=c);r.on("end",()=>r2(JSON.parse(b||"{}")))})}
// 离线生产计算
function calcOffline(data,ms){
  if(!data||!data.bld||!data.lstP)return data;
  const min=ms/60000;
  if(min<0.1)return data;
  // 生产
  Object.keys(data.bld).forEach(id=>{
    const lv=data.bld[id]||0;
    if(lv<=0)return;
    const w=(data.fc&&data.fc[id]&&data.fc[id].w)||{};
    const wb=(w.c||0)*0.05+(w.b||0)*0.1+(w.a||0)*0.18+(w.s||0)*0.3;
    const rate=lv*0.1*(1+wb);
    if(!data.bp)data.bp={};
    data.bp[id]=(data.bp[id]||0)+rate*min;
    const units=Math.floor(data.bp[id]);
    if(units>0){
      if(!data.sq)data.sq={};
      data.sq[id]=(data.sq[id]||0)+units;
      data.bp[id]-=units;
      if(data.wp!==undefined)data.wp=(data.wp||0)+units;
    }
  });
  // 销售
  if(data.sq){
    Object.keys(data.sq).forEach(id=>{
      if(!data.sq[id]||data.sq[id]<=0)return;
      const a=(data.fc&&data.fc[id]&&data.fc[id].a)||{};
      const ab=(a.c||0)*0.03+(a.b||0)*0.06+(a.a||0)*0.1+(a.s||0)*0.18;
      const st=Math.max(5,Math.round(60*(1-ab)));
      const secs=ms/1000;
      if(secs<st)return;
      const canSell=Math.floor(secs/st);
      if(canSell<=0)return;
      const sell=Math.min(canSell,data.sq[id]);
      if(sell>0){
        const price=PP[id]||100;
        data.sq[id]-=sell;
        if(data.gold!==undefined)data.gold+=Math.round(price*sell*(1+ab));
        if(data.sq[id]<=0)delete data.sq[id];
        if(data.sl){
          data.sl.unshift({id:id,q:sell,e:Math.round(price*sell*(1+ab))});
          if(data.sl.length>20)data.sl.pop();
        }
      }
    });
  }
  data.lstP=Date.now();
  return data;
}

h.createServer(async(q,r)=>{
  const u=new URL(q.url,"http://x");
  r.setHeader("Access-Control-Allow-Origin","*");
  r.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  r.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(q.method==="OPTIONS"){r.end();return}
  if(u.pathname==="/"){
    const hf=f.readFileSync(p.join(__dirname,"数学RPG.html"),"utf8");
    r.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    r.end(hf);return
  }
  if(u.pathname==="/api/register"&&q.method==="POST"){
    const id=Date.now().toString(36)+Math.random().toString(36).substr(2,4);
    f.writeFileSync(p.join(dir,id+".json"),'{"_init":true}');
    r.writeHead(200,{"Content-Type":"application/json"});
    r.end(JSON.stringify({id}));return
  }
  if(u.pathname==="/api/save"&&q.method==="POST"){
    const b=await br(q);
    if(b.id){
      
      f.writeFileSync(p.join(dir,b.id+".json"),JSON.stringify(b.data||{}));
      r.writeHead(200,{"Content-Type":"application/json"});r.end('{"ok":true}')
    }else{r.writeHead(400);r.end('{"error":"no id"}')}
    return
  }
  if(u.pathname==="/api/load"&&q.method==="POST"){
    const b=await br(q),fl=p.join(dir,b.id+".json");
    if(b.id&&f.existsSync(fl)){
      let dt=JSON.parse(f.readFileSync(fl,"utf8"));
      if(dt._init)delete dt._init; // initial empty state
      if(dt.lstP&&dt.lstP>0){
        const now=Date.now(),elapsed=Math.min(now-dt.lstP,43200000); // max 12h
        if(elapsed>1000)dt=calcOffline(dt,elapsed);
        else dt.lstP=now;
      }
      f.writeFileSync(fl,JSON.stringify(dt));
      r.writeHead(200,{"Content-Type":"application/json"});
      r.end(JSON.stringify({data:dt}))
    }else{r.writeHead(200,{"Content-Type":"application/json"});r.end('{"data":null}')}
    return
  }
  r.writeHead(404);r.end("Not found")
}).listen(process.env.PORT||8080,()=>console.log("Server on 8080"))