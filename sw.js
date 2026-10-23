const VER="colosseo-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./substitute.png"];
const EXT=["raw.githubusercontent.com","unpkg.com"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url),same=u.origin===location.origin;
  if(!same&&!EXT.includes(u.hostname))return; // 対人戦の通信などには触らない
  if(r.mode==="navigate"){ // ページ本体はネット優先（更新がすぐ届く）。オフライン時はキャッシュ
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(VER).then(x=>x.put("./index.html",c));return res}).catch(()=>caches.match("./index.html").then(h=>h||caches.match("./"))||Response.error()));return}
  // 画像・ライブラリはキャッシュ優先＋裏で更新
  const req=same?r:new Request(r.url,{mode:"cors",credentials:"omit"});
  e.respondWith(caches.open(VER).then(async c=>{const hit=await c.match(r);
    const net=fetch(req).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(r,res.clone());return res}).catch(()=>hit||Response.error());
    return hit||net}));
});
