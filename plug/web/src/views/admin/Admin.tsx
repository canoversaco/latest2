import React, { useEffect, useMemo, useState } from 'react'
import { API } from '../../api'
import { useStore } from '../../store'
import { ClipboardList, Truck, CheckCircle2, XCircle, MapPin, UserCheck } from 'lucide-react'

export default function AdminView(){
  const [tab,setTab]=useState<'bestellungen'|'menue'|'nutzer'|'konfiguration'|'gebuehren'|'berichte'>('bestellungen')
  return (
    <div className="container p-4 space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['bestellungen','menue','nutzer','konfiguration','gebuehren','berichte'].map((k)=>(
          <button key={k} className={`btn ${tab===k?'btn-primary':''}`} onClick={()=>setTab(k as any)}>
            {k==='bestellungen'?'Bestellungen':k==='menue'?'Menü/Kategorien':k==='nutzer'?'Nutzerverwaltung':k==='konfiguration'?'Konfiguration':k==='gebuehren'?'Gebühren & Zonen':'Berichte'}
          </button>
        ))}
      </div>
      {tab==='bestellungen' && <AdminOrders/>}
      {tab==='menue' && <Hint text="Menü/Kategorien: CRUD bleibt unverändert – jetzt deutsch beschriftet."/>}
      {tab==='nutzer' && <Hint text="Nutzerverwaltung: Accounts anlegen/ändern – deutsch beschriftet."/>}
      {tab==='konfiguration' && <Hint text="Konfiguration: Abholen/Liefern/Versand, Abholadresse, Push an Alle/Segmente."/>}
      {tab==='gebuehren' && <Hint text="Gebühren & Zonen: km-basiert, Lieferzonen verwalten."/>}
      {tab==='berichte' && <Hint text="Berichte: Umsatz, Heatmap, Kurier-Performance."/>}
    </div>
  )
}

function Hint({text}:{text:string}){ return <div className="card text-slate-300">{text}</div> }

function AdminOrders(){
  const [orders,setOrders]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [pickupLoc,setPickupLoc]=useState<string>('Plug Store, Musterstraße 1')
  const [courier,setCourier]=useState<string>('kurier1')

  async function load(){
    setLoading(true)
    try{
      const r = await API.req('/api/admin/orders')
      setOrders(r.orders||[])
    }catch(e){ console.error(e) } finally { setLoading(false) }
  }
  useEffect(()=>{ load(); const t=setInterval(load, 4000); return ()=>clearInterval(t) },[])

  const wartend = useMemo(()=>orders.filter(o=>o.status==='wartet_bestätigung'),[orders])
  const angenommen = useMemo(()=>orders.filter(o=>o.status==='angenommen'||o.status==='in_zubereitung'),[orders])
  const unterwegs = useMemo(()=>orders.filter(o=>o.status==='unterwegs'||o.status==='bereit_zur_abholung'),[orders])
  const erledigt = useMemo(()=>orders.filter(o=>o.status==='zugestellt'||o.status==='storniert'),[orders])

  async function accept(o:any){
    const loc = prompt('Abholort bestätigen:', pickupLoc) || pickupLoc
    const r = await API.req(`/api/admin/orders/${o.id}/accept`,{method:'POST', body: JSON.stringify({pickup_location:loc})})
    await load(); alert('Bestellung angenommen. Abholort gesetzt.')
  }
  async function assign(o:any){
    const c = prompt('Kurier Benutzername:', courier) || courier
    await API.req(`/api/admin/orders/${o.id}/assign`,{method:'POST', body: JSON.stringify({courier_username:c})})
    await load(); alert('Kurier zugewiesen.')
  }
  async function setStatus(o:any, status:string){
    await API.req(`/api/admin/orders/${o.id}/status`,{method:'POST', body: JSON.stringify({status})})
    await load()
  }

  return (
    <div className="grid md:grid-cols-4 gap-3">
      <Col title="Wartet auf Annahme" subtitle="Abholen wartet auf Plug-Zusage" list={wartend}>
        {(o:any)=>(
          <div className="space-y-2">
            <Row o={o}/>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={()=>accept(o)}><CheckCircle2 size={16}/> Annehmen</button>
              <button className="btn" onClick={()=>assign(o)}><UserCheck size={16}/> Kurier</button>
              <button className="btn" onClick={()=>setStatus(o,'storniert')}><XCircle size={16}/> Stornieren</button>
            </div>
          </div>
        )}
      </Col>

      <Col title="Angenommen" subtitle="In Zubereitung" list={angenommen}>
        {(o:any)=>(
          <div className="space-y-2">
            <Row o={o}/>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={()=>setStatus(o,'in_zubereitung')}>Zubereitung</button>
              <button className="btn" onClick={()=>setStatus(o, o.type==='pickup' ? 'bereit_zur_abholung' : 'unterwegs')}>
                {o.type==='pickup' ? 'Bereit zur Abholung' : 'Unterwegs'}
              </button>
            </div>
          </div>
        )}
      </Col>

      <Col title="Unterwegs / Bereit" subtitle="Lieferung läuft / Abholung bereit" list={unterwegs}>
        {(o:any)=>(
          <div className="space-y-2">
            <Row o={o}/>
            <div className="flex gap-2">
              {o.type!=='pickup' && <button className="btn" onClick={()=>setStatus(o,'unterwegs')}><Truck size={16}/> Unterwegs</button>}
              <button className="btn btn-primary" onClick={()=>setStatus(o,'zugestellt')}>Zugestellt</button>
            </div>
          </div>
        )}
      </Col>

      <Col title="Erledigt" subtitle="Zugestellt / Storniert" list={erledigt}>
        {(o:any)=><Row o={o}/>}
      </Col>
    </div>
  )
}

function Col({title,subtitle,list,children}:{title:string,subtitle:string,list:any[],children:(o:any)=>React.ReactNode}){
  return (
    <div className="card">
      <div className="font-bold">{title}</div>
      <div className="text-xs text-slate-400 mb-2">{subtitle}</div>
      <div className="space-y-3">
        {list.length===0 && <div className="text-slate-500 text-sm">Keine Einträge</div>}
        {list.map(o=>(<div key={o.id} className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">{children(o)}</div>))}
      </div>
    </div>
  )
}

function Row({o}:{o:any}){
  const money = (c:number)=>'€'+(c/100).toFixed(2)
  return (
    <div>
      <div className="flex justify-between">
        <div className="font-semibold">#{o.id} • {o.type==='pickup'?'Abholen':o.type==='delivery'?'Lieferung':'Versand'}</div>
        <div className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800">{o.status}</div>
      </div>
      {o.pickup_location && <div className="text-xs text-emerald-300 mt-1"><MapPin size={12} className="inline mr-1"/> Abholort: <b>{o.pickup_location}</b></div>}
      <div className="text-xs mt-1">{o.items?.map((it:any)=>`${it.qty}× ${it.name}`).join(' • ')}</div>
      <div className="text-sm mt-1">Gesamt: <b>{money(o.total_cents)}</b></div>
    </div>
  )
}
