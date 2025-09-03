import React, { useEffect, useMemo, useState } from 'react'
import { API } from '../api'
import { useStore } from '../store'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AdminPanel(){
  const { ui, setUI } = useStore()
  const tabs = [
    ['uebersicht','Übersicht'],
    ['bestellungen','Bestellungen'],
    ['katalog','Katalog'],
    ['nutzer','Nutzer'],
    ['einstellungen','Einstellungen'],
    ['gutscheine','Gutscheine'],
    ['berichte','Berichte'],
    ['exporte','Exporte'],
    ['kasse','Kasse'],
    ['manuell','Manuelle Bestellung']
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([k,label])=>
          <button key={k} className={`btn ${ui.adminTab===k?'':'opacity-70'}`} onClick={()=>setUI({adminTab:k})}>{label}</button>
        )}
      </div>
      {ui.adminTab==='uebersicht' && <Dashboard/>}
      {ui.adminTab==='bestellungen' && <OrdersKanban/>}
      {ui.adminTab==='katalog' && <Catalog/>}
      {ui.adminTab==='nutzer' && <Users/>}
      {ui.adminTab==='einstellungen' && <Config/>}
      {ui.adminTab==='gutscheine' && <Coupons/>}
      {ui.adminTab==='berichte' && <Reports/>}
      {ui.adminTab==='exporte' && <Exports/>}
      {ui.adminTab==='kasse' && <CashDesk/>}
      {ui.adminTab==='manuell' && <ManualOrder/>}
    </div>
  )
}

function Dashboard(){
  const [o,setO]=useState<any[]>([])
  useEffect(()=>{ API.req('/orders').then(d=>setO(d.orders)) },[])
  const counts = useMemo(()=>['pending','assigned','picked','enroute','delivered','completed','canceled'].map(s=>({status:s, n:o.filter(x=>x.status===s).length})),[o])
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {counts.map(c=><div key={c.status} className="card"><div className="text-sm opacity-70 capitalize">{c.status}</div><div className="text-2xl font-extrabold">{c.n}</div></div>)}
      <div className="card md:col-span-2">
        <div className="section-title">Broadcast</div>
        <BroadcastForm/>
      </div>
    </div>
  )
}

function OrdersKanban(){
  const [orders,setOrders]=useState<any[]>([])
  const [couriers,setCouriers]=useState<any[]>([])
  useEffect(()=>{ API.req('/orders').then(d=>setOrders(d.orders)); API.req('/admin/users').then(d=>setCouriers(d.list.filter((u:any)=>u.role==='courier'))) },[])
  async function setStatus(id:number,status:string){ await API.req(`/orders/${id}/status`,{ method:'PUT', body: JSON.stringify({ status })}); const d=await API.req('/orders'); setOrders(d.orders) }
  async function assign(id:number,courier_id:number){ await API.req(`/orders/${id}/assign`,{ method:'PUT', body: JSON.stringify({ courier_id })}); const d=await API.req('/orders'); setOrders(d.orders) }
  const cols=['pending','assigned','picked','enroute','delivered','completed','canceled']
  return (
    <div className="grid md:grid-cols-7 gap-3">
      {cols.map(s=>
        <div key={s} className="card">
          <div className="font-semibold capitalize">{s}</div>
          <div className="mt-2 space-y-2">
            {orders.filter(o=>o.status===s).map(o=>
              <div key={o.id} className="p-2 rounded bg-slate-900">
                <div className="flex justify-between"><b>#{o.id}</b><span className="text-plug-primary">{(o.total_cents/100).toFixed(2)}€</span></div>
                <div className="text-xs opacity-70">{o.delivery_type} • {o.address||'Abholung'}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {['picked','enroute','delivered','completed','canceled'].map(x=><button key={x} className="btn" onClick={()=>setStatus(o.id,x)}>{x}</button>)}
                  <select className="input" onChange={e=>assign(o.id,parseInt(e.target.value))} defaultValue={o.courier_id||''}>
                    <option value="">Kurier zuweisen…</option>
                    {couriers.map((c:any)=><option key={c.id} value={c.id}>#{c.id} {c.username}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Catalog(){
  const [menu,setMenu]=useState<any>({categories:[],products:[]})
  const [newCat,setNewCat]=useState('Neue Kategorie'); const [prod,setProd]=useState<any>({name:'Neuer Artikel',price_cents:500})
  useEffect(()=>{ API.req('/menu').then(setMenu) },[])
  async function addCat(){ await API.req('/admin/category',{ method:'POST', body: JSON.stringify({ name:newCat })}); setMenu(await API.req('/menu')) }
  async function addProd(){ await API.req('/admin/product',{ method:'POST', body: JSON.stringify(prod)}); setMenu(await API.req('/menu')) }
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="card">
        <div className="section-title">Kategorien</div>
        <ul className="list-disc pl-6">
          {menu.categories.map((c:any)=><li key={c.id}>{c.name}</li>)}
        </ul>
        <div className="mt-2 flex gap-2"><input className="input" value={newCat} onChange={e=>setNewCat(e.target.value)}/><button className="btn" onClick={addCat}>+ Kategorie</button></div>
      </div>
      <div className="card">
        <div className="section-title">Produkt</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Name" value={prod.name} onChange={e=>setProd({...prod,name:e.target.value})}/>
          <input className="input" type="number" placeholder="Preis (Cent)" value={prod.price_cents} onChange={e=>setProd({...prod,price_cents:+e.target.value})}/>
          <input className="input" placeholder="Bild-URL" value={prod.image_url||''} onChange={e=>setProd({...prod,image_url:e.target.value})}/>
          <select className="input" onChange={e=>setProd({...prod,category_id:+e.target.value})}><option>Kategorie wählen…</option>{menu.categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <button className="btn mt-2" onClick={addProd}>+ Produkt</button>
      </div>
    </div>
  )
}

function Users(){
  const [users,setUsers]=useState<any[]>([]); const [nu,setNu]=useState<any>({username:'userX',password:'pass',role:'customer'})
  useEffect(()=>{ API.req('/admin/users').then(d=>setUsers(d.list)) },[])
  async function add(){ await API.req('/admin/users',{ method:'POST', body: JSON.stringify(nu) }); setUsers((await API.req('/admin/users')).list) }
  return (
    <div className="card">
      <div className="section-title">Nutzerverwaltung</div>
      <div className="grid md:grid-cols-4 gap-2">
        <input className="input" placeholder="Benutzername" value={nu.username} onChange={e=>setNu({...nu,username:e.target.value})}/>
        <input className="input" placeholder="Passwort" value={nu.password} onChange={e=>setNu({...nu,password:e.target.value})}/>
        <select className="input" value={nu.role} onChange={e=>setNu({...nu,role:e.target.value})}><option>customer</option><option>courier</option><option>admin</option></select>
        <button className="btn" onClick={add}>+ Nutzer</button>
      </div>
      <div className="mt-3 space-y-1">{users.map(u=><div key={u.id} className="p-2 rounded bg-slate-900 text-sm">#{u.id} • {u.username} • {u.role}</div>)}</div>
    </div>
  )
}

function Config(){
  const [cfg,setCfg]=useState<any>(null)
  useEffect(()=>{ API.req('/config').then(d=>setCfg(d.config)) },[])
  if(!cfg) return <div className="card">Lade…</div>
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="card">
        <div className="section-title">Abholen / Lieferung / Versand</div>
        <input className="input" value={cfg.pickup_address} onChange={e=>setCfg({...cfg,pickup_address:e.target.value})} placeholder="Abholadresse"/>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <input className="input" type="number" value={cfg.delivery_base_cents} onChange={e=>setCfg({...cfg,delivery_base_cents:+e.target.value})} placeholder="Basis (Cent)"/>
          <input className="input" type="number" value={cfg.delivery_per_km_cents} onChange={e=>setCfg({...cfg,delivery_per_km_cents:+e.target.value})} placeholder="pro km (Cent)"/>
          <input className="input" type="number" value={cfg.shipping_flat_cents} onChange={e=>setCfg({...cfg,shipping_flat_cents:+e.target.value})} placeholder="Versand (Cent)"/>
        </div>
        <div className="mt-2 text-sm opacity-70">Zonen (JSON)</div>
        <textarea className="input h-40" value={JSON.stringify(cfg.zones||[],null,2)} onChange={e=>{ try{ setCfg({...cfg, zones: JSON.parse(e.target.value)}) }catch{} }} />
        <button className="btn mt-2" onClick={async ()=>{ await API.req('/config',{ method:'PUT', body: JSON.stringify(cfg)}); alert('Gespeichert'); }}>Speichern</button>
      </div>
      <div className="card">
        <div className="section-title">Push an Segment</div>
        <BroadcastForm/>
        <div className="section-title mt-4">CSV Export</div>
        <div className="flex gap-2"><a className="btn" href="/api/admin/export/wallet.csv" target="_blank">Wallet CSV</a></div>
      </div>
    </div>
  )
}
function BroadcastForm(){ const [role,setRole]=useState(''); const [userId,setUserId]=useState(''); const [title,setTitle]=useState('Hinweis'); const [body,setBody]=useState('Hallo!')
  async function send(){ if(userId){ await API.req('/admin/push/target',{ method:'POST', body: JSON.stringify({ user_id:+userId, title, body })}); }
    else if(role){ await API.req('/admin/push/target',{ method:'POST', body: JSON.stringify({ role, title, body })}); }
    else { await API.req('/admin/push/broadcast',{ method:'POST', body: JSON.stringify({ title, body })}); }
    alert('Gesendet'); }
  return <div className="space-y-2">
    <input className="input" placeholder="Titel" value={title} onChange={e=>setTitle(e.target.value)}/>
    <input className="input" placeholder="Text" value={body} onChange={e=>setBody(e.target.value)}/>
    <div className="grid grid-cols-3 gap-2">
      <select className="input" value={role} onChange={e=>setRole(e.target.value)}><option value="">Rolle (optional)</option><option>customer</option><option>courier</option><option>admin</option></select>
      <input className="input" placeholder="User-ID (optional)" value={userId} onChange={e=>setUserId(e.target.value)}/>
      <button className="btn" onClick={send}>Senden</button>
    </div>
  </div>
}

function Coupons(){
  const [list,setList]=useState<any[]>([])
  const [form,setForm]=useState<any>({code:'WILLKOMMEN10',type:'percent',value:10})
  useEffect(()=>{ API.req('/admin/coupons').then(d=>setList(d.list)) },[])
  async function add(){ await API.req('/admin/coupons',{ method:'POST', body: JSON.stringify(form)}); setList((await API.req('/admin/coupons')).list) }
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="card">
        <div className="section-title">Neuer Gutschein</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="CODE" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>
          <select className="input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>percent</option><option>fixed</option></select>
          <input className="input" type="number" placeholder="Wert" value={form.value} onChange={e=>setForm({...form,value:+e.target.value})}/>
          <input className="input" type="number" placeholder="max uses (optional)" onChange={e=>setForm({...form,max_uses:+e.target.value||null})}/>
        </div>
        <button className="btn mt-2" onClick={add}>+ Gutschein</button>
      </div>
      <div className="card">
        <div className="section-title">Liste</div>
        <div className="space-y-1">{list.map(c=><div key={c.id} className="p-2 rounded bg-slate-900 text-sm">{c.code} • {c.type} {c.value} • benutzt {c.used_count}/{c.max_uses||'∞'}</div>)}</div>
      </div>
    </div>
  )
}

function Reports(){
  const [sum,setSum]=useState<any>({daily:[],byCourier:[]})
  const [zones,setZones]=useState<any>({zones:[]})
  useEffect(()=>{ API.req('/admin/reports/summary').then(setSum); API.req('/admin/reports/zones').then(setZones) },[])
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="card">
        <div className="section-title">Umsatz letzte 7 Tage</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sum.daily.map((d:any)=>({ tag:new Date(d.ts*1000).toLocaleDateString(), umsatz: d.revenue_cents/100 }))}>
              <XAxis dataKey="tag"/><YAxis/><Tooltip/><Bar dataKey="umsatz" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <div className="section-title">Zonen-Heatmap (Anzahl)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={zones.zones.map((z:any)=>({name:z.name,value:z.count}))} dataKey="value" nameKey="name" label>{zones.zones.map((_:any,i:number)=><Cell key={i} />)}</Pie></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
function Exports(){ return <div className="card"><div className="section-title">Exporte</div><div className="flex gap-2"><a className="btn" href="/api/admin/export/wallet.csv" target="_blank">Wallet CSV</a></div></div> }

function CashDesk(){
  const [uid,setUid]=useState(''); const [delta,setDelta]=useState(''); const [addr,setAddr]=useState(''); const [credit,setCredit]=useState('');
  async function adjust(){ await API.req('/admin/wallet/adjust',{ method:'POST', body: JSON.stringify({ user_id:+uid, delta_cents:+delta, reason:'Kasse' })}); alert('Konto angepasst'); }
  async function creditByAddr(){ await API.req('/admin/wallet/creditByAddress',{ method:'POST', body: JSON.stringify({ address: addr, amount_cents:+credit })}); alert('Gutschrift gebucht'); }
  return <div className="card space-y-2">
    <div className="section-title">Kasse / Wallet</div>
    <div className="grid md:grid-cols-3 gap-2">
      <input className="input" placeholder="User-ID" value={uid} onChange={e=>setUid(e.target.value)}/>
      <input className="input" placeholder="Δ Cent (+/-)" value={delta} onChange={e=>setDelta(e.target.value)}/>
      <button className="btn" onClick={adjust}>Anpassen</button>
    </div>
    <div className="grid md:grid-cols-3 gap-2">
      <input className="input" placeholder="BTC-Adresse" value={addr} onChange={e=>setAddr(e.target.value)}/>
      <input className="input" placeholder="Gutschrift (Cent)" value={credit} onChange={e=>setCredit(e.target.value)}/>
      <button className="btn" onClick={creditByAddr}>BTC Gutschrift</button>
    </div>
  </div>
}

function ManualOrder(){
  const [uid,setUid]=useState(''); const [items,setItems]=useState('[{"product_id":1,"qty":1}]')
  async function create(){ await API.req('/admin/orders/new',{ method:'POST', body: JSON.stringify({ user_id:+uid, items: JSON.parse(items), delivery_type:'pickup', charge_wallet:true })}); alert('Bestellung angelegt') }
  return <div className="card">
    <div className="section-title">Manuelle Bestellung</div>
    <div className="grid md:grid-cols-2 gap-2">
      <input className="input" placeholder="User-ID" value={uid} onChange={e=>setUid(e.target.value)}/>
      <textarea className="input h-28" value={items} onChange={e=>setItems(e.target.value)} />
    </div>
    <button className="btn mt-2" onClick={create}>Erstellen</button>
  </div>
}
