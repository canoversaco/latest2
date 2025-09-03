const CORE='plug-core-v4', ASSETS=['/','/index.html','/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CORE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{ for(const k of await caches.keys()) if(k!==CORE) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(u.pathname.startsWith('/api/')) return; e.respondWith((async()=>{ const c=await caches.open(CORE); const m=await c.match(e.request); const f=fetch(e.request).then(r=>{ if(r.ok && e.request.method==='GET') c.put(e.request,r.clone()); return r; }).catch(()=>m); return m||f; })()); });
self.addEventListener('push',e=>{ const d=e.data?e.data.json():{title:'Plug',body:'Ereignis'}; e.waitUntil(self.registration.showNotification(d.title,{ body:d.body, icon:'/icons/icon-192.png', badge:'/icons/icon-192.png' })); });
self.addEventListener('notificationclick',e=>{ e.notification.close(); e.waitUntil(clients.openWindow('/')); });
